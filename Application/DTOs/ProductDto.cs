namespace Application.DTOs;

public class ProductDto
{
    public int Id { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public bool IsActive { get; set; }
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public int StockOnHand { get; set; }
    public int StockReserved { get; set; }
    public int ReorderThreshold { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}