namespace Application.DTOs;

public class InventoryCategorySummaryDto
{
    public string Name { get; set; } = string.Empty;
    public int Count { get; set; }
    public int AvailableUnits { get; set; }
}