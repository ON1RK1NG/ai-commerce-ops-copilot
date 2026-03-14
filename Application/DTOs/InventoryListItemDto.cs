namespace Application.DTOs;

public class InventoryListItemDto
{
    public int ProductId { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public int StockOnHand { get; set; }
    public int StockReserved { get; set; }
    public int StockAvailable { get; set; }
    public int ReorderThreshold { get; set; }
    public bool IsLowStock { get; set; }
    public bool IsOutOfStock { get; set; }
    public int RecommendedRestockUnits { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}
