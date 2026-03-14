namespace Application.DTOs;

public class OrderListResponseDto
{
    public List<OrderListItemDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
    public decimal TotalRevenueInQuery { get; set; }
    public int TotalUnitsInQuery { get; set; }
}
