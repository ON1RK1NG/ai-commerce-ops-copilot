namespace Application.DTOs;

public class InventoryListResponseDto
{
    public List<InventoryListItemDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
    public int LowStockCount { get; set; }
    public int OutOfStockCount { get; set; }
    public int HealthyCount { get; set; }
    public int TotalAvailableUnits { get; set; }
}
