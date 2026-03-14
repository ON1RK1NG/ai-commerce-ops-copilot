using Domain.Entities;

public class InventoryMovement
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public string MovementType { get; set; } = null!;
    public int Quantity { get; set; }
    public string Reason { get; set; } = string.Empty;
    public int StockOnHandAfter { get; set; }
    public int StockReservedAfter { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
