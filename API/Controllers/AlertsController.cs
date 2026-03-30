using API.Services;
using Application.DTOs;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AlertsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly LowStockAlertService _lowStockAlertService;

    public AlertsController(AppDbContext context, LowStockAlertService lowStockAlertService)
    {
        _context = context;
        _lowStockAlertService = lowStockAlertService;
    }

    [HttpGet]
    public async Task<ActionResult<AlertListResponseDto>> GetAlerts([FromQuery] AlertQueryParametersDto query)
    {
        var page = query.Page < 1 ? 1 : query.Page;
        var pageSize = query.PageSize < 1 ? 10 : query.PageSize > 100 ? 100 : query.PageSize;

        var alertsQuery = _context.Alerts
            .AsNoTracking()
            .Include(x => x.Product)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLower();

            alertsQuery = alertsQuery.Where(x =>
                x.Title.ToLower().Contains(search) ||
                x.Description.ToLower().Contains(search) ||
                (x.Product != null && x.Product.Name.ToLower().Contains(search)) ||
                (x.Product != null && x.Product.Sku.ToLower().Contains(search)));
        }

        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            var status = query.Status.Trim().ToLower();

            alertsQuery = status switch
            {
                "open" => alertsQuery.Where(x => !x.IsAcknowledged && !x.IsResolved),
                "acknowledged" => alertsQuery.Where(x => x.IsAcknowledged && !x.IsResolved),
                "resolved" => alertsQuery.Where(x => x.IsResolved),
                _ => alertsQuery
            };
        }

        if (!string.IsNullOrWhiteSpace(query.Severity))
        {
            var severity = query.Severity.Trim().ToLower();
            alertsQuery = alertsQuery.Where(x => x.Severity.ToLower() == severity);
        }

        if (!string.IsNullOrWhiteSpace(query.AlertType))
        {
            var alertType = query.AlertType.Trim().ToLower();
            alertsQuery = alertsQuery.Where(x => x.AlertType.ToLower() == alertType);
        }

        var totalCount = await alertsQuery.CountAsync();

        var openCount = await alertsQuery.CountAsync(x => !x.IsAcknowledged && !x.IsResolved);
        var acknowledgedCount = await alertsQuery.CountAsync(x => x.IsAcknowledged && !x.IsResolved);
        var resolvedCount = await alertsQuery.CountAsync(x => x.IsResolved);

        var criticalCount = await alertsQuery.CountAsync(x => x.Severity.ToLower() == "critical");
        var warningCount = await alertsQuery.CountAsync(x => x.Severity.ToLower() == "warning");
        var infoCount = await alertsQuery.CountAsync(x => x.Severity.ToLower() == "info");

        var items = await alertsQuery
            .OrderBy(x => x.IsResolved)
            .ThenBy(x => x.IsAcknowledged)
            .ThenByDescending(x => x.Severity == "critical")
            .ThenByDescending(x => x.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new AlertListItemDto
            {
                Id = x.Id,
                ProductId = x.ProductId,
                Sku = x.Product != null ? x.Product.Sku : string.Empty,
                ProductName = x.Product != null ? x.Product.Name : string.Empty,
                AlertType = x.AlertType,
                Severity = x.Severity,
                Title = x.Title,
                Description = x.Description,
                Status = x.IsResolved
                    ? "resolved"
                    : x.IsAcknowledged
                        ? "acknowledged"
                        : "open",
                CreatedAtUtc = x.CreatedAtUtc,
                ResolvedAtUtc = x.ResolvedAtUtc
            })
            .ToListAsync();

        var totalPages = totalCount == 0
            ? 0
            : (int)Math.Ceiling(totalCount / (double)pageSize);

        return Ok(new AlertListResponseDto
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            TotalPages = totalPages,
            OpenCount = openCount,
            AcknowledgedCount = acknowledgedCount,
            ResolvedCount = resolvedCount,
            CriticalCount = criticalCount,
            WarningCount = warningCount,
            InfoCount = infoCount
        });
    }

    [HttpPost("sync-low-stock")]
    public async Task<ActionResult> SyncLowStockAlerts(CancellationToken cancellationToken)
    {
        var productIds = await _context.Products
            .AsNoTracking()
            .Select(x => x.Id)
            .ToListAsync(cancellationToken);

        await _lowStockAlertService.SyncForProductsAsync(productIds, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { message = "Low-stock alerts synced successfully." });
    }

    [HttpPut("{id:int}/acknowledge")]
    public async Task<ActionResult> Acknowledge(int id)
    {
        var alert = await _context.Alerts.FirstOrDefaultAsync(x => x.Id == id);

        if (alert is null)
        {
            return NotFound();
        }

        if (!alert.IsResolved)
        {
            alert.IsAcknowledged = true;
            alert.AcknowledgedAtUtc = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        return NoContent();
    }

    [HttpPut("{id:int}/resolve")]
    public async Task<ActionResult> Resolve(int id)
    {
        var alert = await _context.Alerts.FirstOrDefaultAsync(x => x.Id == id);

        if (alert is null)
        {
            return NotFound();
        }

        if (!alert.IsResolved)
        {
            alert.IsResolved = true;

            if (!alert.IsAcknowledged)
            {
                alert.IsAcknowledged = true;
                alert.AcknowledgedAtUtc = DateTime.UtcNow;
            }

            alert.ResolvedAtUtc = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        return NoContent();
    }
}