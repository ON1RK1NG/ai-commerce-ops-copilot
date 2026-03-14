namespace Application.DTOs;

public class CreateOrderRequest
{
    public string Status { get; set; } = "Pending";
    public string PaymentStatus { get; set; } = "Pending";
    public string CustomerCountry { get; set; } = string.Empty;
    public string Market { get; set; } = string.Empty;
    public List<CreateOrderItemRequest> Items { get; set; } = new();
}
