namespace Application.DTOs;

public class CreateProductRequest
{
    public string Sku { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public int CategoryId { get; set; }
    public int StockOnHand { get; set; }
    public int StockReserved { get; set; }
    public int ReorderThreshold { get; set; }
}