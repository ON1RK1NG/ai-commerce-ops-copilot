namespace Application.DTOs;

public class DashboardSummaryDto
{
    public int TotalProducts { get; set; }
    public int LowStockCount { get; set; }
    public int OutOfStockCount { get; set; }
    public int TodayOrdersCount { get; set; }
    public decimal TodayRevenue { get; set; }
    public int StockAttentionCount { get; set; }
    public int OpenAlertsCount { get; set; }
    public List<DashboardTopSellingProductDto> TopSellingProducts { get; set; } = new();
    public List<DashboardRecentOrderDto> RecentOrders { get; set; } = new();
    public List<DashboardAlertDto> RecentAlerts { get; set; } = new();
}

public class DashboardTopSellingProductDto
{
    public int ProductId { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int UnitsSold { get; set; }
    public int OrdersCount { get; set; }
    public decimal Revenue { get; set; }
}

public class DashboardRecentOrderDto
{
    public int Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public string CustomerCountry { get; set; } = string.Empty;
    public string Market { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
}

public class DashboardAlertDto
{
    public int Id { get; set; }
    public int? ProductId { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string AlertType { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
}