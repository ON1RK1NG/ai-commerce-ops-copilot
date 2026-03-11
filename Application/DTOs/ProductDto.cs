namespace Application.DTOs;

public class ProductDto
{
    public int Id { get; set; }
    public string Sku { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public bool IsActive { get; set; }
    public string Category { get; set; } = null!;
    public int StockOnHand { get; set; }
    public int StockReserved { get; set; }
    public int ReorderThreshold { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}