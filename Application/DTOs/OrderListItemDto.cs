namespace Application.DTOs;

public class OrderListItemDto
{
    public int Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public string CustomerCountry { get; set; } = string.Empty;
    public string Market { get; set; } = string.Empty;
    public int ItemsCount { get; set; }
    public int TotalUnits { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
