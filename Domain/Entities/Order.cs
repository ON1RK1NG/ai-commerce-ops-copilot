namespace Domain.Entities;

public class Order
{
    public int Id { get; set; }
    public string OrderNumber { get; set; } = null!;
    public string Status { get; set; } = "Pending";
    public string PaymentStatus { get; set; } = "Pending";
    public decimal TotalAmount { get; set; }
    public string CustomerCountry { get; set; } = string.Empty;
    public string Market { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
}
