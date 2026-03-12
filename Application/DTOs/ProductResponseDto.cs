namespace YourProjectNamespace.Dtos.Products;

public class ProductResponseDto
{
    public int Id { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public int Stock { get; set; }
    public int Reserved { get; set; }
    public int Threshold { get; set; }
}