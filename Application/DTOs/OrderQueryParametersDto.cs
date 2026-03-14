namespace Application.DTOs;

public class OrderQueryParametersDto
{
    public string? Search { get; set; }
    public string? Status { get; set; }
    public string? PaymentStatus { get; set; }
    public string? SortBy { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}
