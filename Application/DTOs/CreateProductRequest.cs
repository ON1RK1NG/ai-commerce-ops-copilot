namespace Application.DTOs;

public class CreateProductRequest
{
    public string Sku { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int CategoryId { get; set; }
    public int StockOnHand { get; set; }
    public int StockReserved { get; set; }
    public int ReorderThreshold { get; set; }
}