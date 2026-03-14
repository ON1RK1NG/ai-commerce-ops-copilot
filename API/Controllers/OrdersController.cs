using System.Text.Json;
using Application.DTOs;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly AppDbContext _context;

    public OrdersController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<OrderListResponseDto>> GetOrders([FromQuery] OrderQueryParametersDto query)
    {
        var page = query.Page < 1 ? 1 : query.Page;
        var pageSize = query.PageSize <= 0 ? 10 : Math.Min(query.PageSize, 100);

        var filteredOrders = BuildFilteredOrdersQuery(query);

        var totalCount = await filteredOrders.CountAsync();
        var totalRevenue = await filteredOrders.SumAsync(x => (decimal?)x.TotalAmount) ?? 0m;
        var totalUnits = await filteredOrders
            .SelectMany(x => x.Items)
            .SumAsync(x => (int?)x.Quantity) ?? 0;

        var sortedOrders = ApplySorting(filteredOrders, query.SortBy);

        var items = await sortedOrders
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new OrderListItemDto
            {
                Id = x.Id,
                OrderNumber = x.OrderNumber,
                Status = x.Status,
                PaymentStatus = x.PaymentStatus,
                TotalAmount = x.TotalAmount,
                CustomerCountry = x.CustomerCountry,
                Market = x.Market,
                ItemsCount = x.Items.Count,
                TotalUnits = x.Items.Sum(item => item.Quantity),
                CreatedAtUtc = x.CreatedAtUtc
            })
            .ToListAsync();

        return Ok(new OrderListResponseDto
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            TotalPages = totalCount == 0 ? 1 : (int)Math.Ceiling(totalCount / (double)pageSize),
            TotalRevenueInQuery = totalRevenue,
            TotalUnitsInQuery = totalUnits
        });
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<OrderDetailDto>> GetOrderById(int id)
    {
        var order = await _context.Orders
            .AsNoTracking()
            .Include(x => x.Items)
                .ThenInclude(x => x.Product)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (order is null)
        {
            return NotFound();
        }

        return Ok(new OrderDetailDto
        {
            Id = order.Id,
            OrderNumber = order.OrderNumber,
            Status = order.Status,
            PaymentStatus = order.PaymentStatus,
            TotalAmount = order.TotalAmount,
            CustomerCountry = order.CustomerCountry,
            Market = order.Market,
            CreatedAtUtc = order.CreatedAtUtc,
            Items = order.Items.Select(item => new OrderItemDto
            {
                Id = item.Id,
                ProductId = item.ProductId,
                Sku = item.Product?.Sku ?? string.Empty,
                ProductName = item.Product?.Name ?? string.Empty,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                LineTotal = item.LineTotal
            }).ToList()
        });
    }

    [HttpPost]
    public async Task<ActionResult<OrderDetailDto>> CreateOrder([FromBody] CreateOrderRequest request)
    {
        if (request.Items is null || request.Items.Count == 0)
        {
            return BadRequest("Order must contain at least one item.");
        }

        if (request.Items.Any(x => x.ProductId <= 0 || x.Quantity <= 0))
        {
            return BadRequest("Each order item must have a valid productId and quantity greater than zero.");
        }

        var productIds = request.Items.Select(x => x.ProductId).Distinct().ToList();

        var products = await _context.Products
            .Include(x => x.InventoryItem)
            .Where(x => productIds.Contains(x.Id))
            .ToListAsync();

        if (products.Count != productIds.Count)
        {
            return BadRequest("One or more products do not exist.");
        }

        foreach (var requestedItem in request.Items)
        {
            var product = products.First(x => x.Id == requestedItem.ProductId);
            var inventoryItem = product.InventoryItem;
            var available = (inventoryItem?.StockOnHand ?? 0) - (inventoryItem?.StockReserved ?? 0);

            if (available < requestedItem.Quantity)
            {
                return BadRequest($"Not enough available stock for product {product.Sku}.");
            }
        }

        var order = new Order
        {
            OrderNumber = GenerateOrderNumber(),
            Status = string.IsNullOrWhiteSpace(request.Status) ? "Pending" : request.Status.Trim(),
            PaymentStatus = string.IsNullOrWhiteSpace(request.PaymentStatus) ? "Pending" : request.PaymentStatus.Trim(),
            CustomerCountry = request.CustomerCountry?.Trim() ?? string.Empty,
            Market = request.Market?.Trim() ?? string.Empty,
            CreatedAtUtc = DateTime.UtcNow,
            Items = new List<OrderItem>()
        };

        foreach (var requestedItem in request.Items)
        {
            var product = products.First(x => x.Id == requestedItem.ProductId);
            var inventoryItem = product.InventoryItem!;

            var lineTotal = product.Price * requestedItem.Quantity;

            order.Items.Add(new OrderItem
            {
                ProductId = product.Id,
                Quantity = requestedItem.Quantity,
                UnitPrice = product.Price,
                LineTotal = lineTotal
            });

            inventoryItem.StockReserved += requestedItem.Quantity;
            inventoryItem.StockOnHand -= requestedItem.Quantity;
            inventoryItem.StockReserved -= requestedItem.Quantity;
            inventoryItem.UpdatedAtUtc = DateTime.UtcNow;
            product.UpdatedAtUtc = DateTime.UtcNow;

            _context.InventoryMovements.Add(new InventoryMovement
            {
                ProductId = product.Id,
                MovementType = "order-placed",
                Quantity = requestedItem.Quantity,
                Reason = $"Order {order.OrderNumber} placed",
                StockOnHandAfter = inventoryItem.StockOnHand,
                StockReservedAfter = inventoryItem.StockReserved,
                CreatedAtUtc = DateTime.UtcNow
            });
        }

        order.TotalAmount = order.Items.Sum(x => x.LineTotal);

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        var systemEvent = new SystemEvent
        {
            EventType = "OrderPlaced",
            PayloadJson = JsonSerializer.Serialize(new
            {
                order.Id,
                order.OrderNumber,
                order.TotalAmount,
                ItemsCount = order.Items.Count,
                order.CreatedAtUtc
            }),
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.SystemEvents.Add(systemEvent);
        await _context.SaveChangesAsync();

        var createdOrder = await _context.Orders
            .AsNoTracking()
            .Include(x => x.Items)
                .ThenInclude(x => x.Product)
            .FirstAsync(x => x.Id == order.Id);

        var result = new OrderDetailDto
        {
            Id = createdOrder.Id,
            OrderNumber = createdOrder.OrderNumber,
            Status = createdOrder.Status,
            PaymentStatus = createdOrder.PaymentStatus,
            TotalAmount = createdOrder.TotalAmount,
            CustomerCountry = createdOrder.CustomerCountry,
            Market = createdOrder.Market,
            CreatedAtUtc = createdOrder.CreatedAtUtc,
            Items = createdOrder.Items.Select(item => new OrderItemDto
            {
                Id = item.Id,
                ProductId = item.ProductId,
                Sku = item.Product?.Sku ?? string.Empty,
                ProductName = item.Product?.Name ?? string.Empty,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                LineTotal = item.LineTotal
            }).ToList()
        };

        return CreatedAtAction(nameof(GetOrderById), new { id = result.Id }, result);
    }

    private IQueryable<Order> BuildFilteredOrdersQuery(OrderQueryParametersDto query)
    {
        var ordersQuery = _context.Orders
            .AsNoTracking()
            .Include(x => x.Items)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLower();
            ordersQuery = ordersQuery.Where(x =>
                x.OrderNumber.ToLower().Contains(search) ||
                x.CustomerCountry.ToLower().Contains(search) ||
                x.Market.ToLower().Contains(search));
        }

        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            var status = query.Status.Trim().ToLower();
            ordersQuery = ordersQuery.Where(x => x.Status.ToLower() == status);
        }

        if (!string.IsNullOrWhiteSpace(query.PaymentStatus))
        {
            var paymentStatus = query.PaymentStatus.Trim().ToLower();
            ordersQuery = ordersQuery.Where(x => x.PaymentStatus.ToLower() == paymentStatus);
        }

        return ordersQuery;
    }

    private static IQueryable<Order> ApplySorting(IQueryable<Order> query, string? sortBy)
    {
        var normalizedSort = sortBy?.Trim().ToLowerInvariant();

        return normalizedSort switch
        {
            "oldest" => query.OrderBy(x => x.CreatedAtUtc),
            "amount-asc" => query.OrderBy(x => x.TotalAmount),
            "amount-desc" => query.OrderByDescending(x => x.TotalAmount),
            "order-number-asc" => query.OrderBy(x => x.OrderNumber),
            _ => query.OrderByDescending(x => x.CreatedAtUtc)
        };
    }

    private static string GenerateOrderNumber()
    {
        return $"ORD-{DateTime.UtcNow:yyyyMMddHHmmssfff}";
    }
}