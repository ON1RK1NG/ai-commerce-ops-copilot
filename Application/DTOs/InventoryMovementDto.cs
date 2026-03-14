namespace Application.DTOs;

public class InventoryMovementDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string MovementType { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public string Reason { get; set; } = string.Empty;
    public int StockOnHandAfter { get; set; }
    public int StockReservedAfter { get; set; }
    public int StockAvailableAfter { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
