namespace Application.DTOs;

public class ProductQueryParametersDto
{
    public string? Search { get; set; }
    public int? CategoryId { get; set; }
    public string? StockStatus { get; set; }
    public string? SortBy { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}