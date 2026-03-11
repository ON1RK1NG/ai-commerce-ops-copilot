namespace Domain.Entities;

public class InventoryItem
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public int StockOnHand { get; set; }
    public int StockReserved { get; set; }
    public int ReorderThreshold { get; set; }
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}