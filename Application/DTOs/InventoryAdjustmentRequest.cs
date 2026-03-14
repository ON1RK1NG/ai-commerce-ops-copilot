namespace Application.DTOs;

public class InventoryAdjustmentRequest
{
    public int ProductId { get; set; }
    public string AdjustmentType { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public string? Reason { get; set; }
}
