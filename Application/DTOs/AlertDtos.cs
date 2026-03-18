namespace Application.DTOs;

public class AlertListItemDto
{
    public int Id { get; set; }
    public int? ProductId { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string AlertType { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? ResolvedAtUtc { get; set; }
}

public class AlertListResponseDto
{
    public List<AlertListItemDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }

    public int OpenCount { get; set; }
    public int AcknowledgedCount { get; set; }
    public int ResolvedCount { get; set; }
    public int CriticalCount { get; set; }
    public int WarningCount { get; set; }
    public int InfoCount { get; set; }
}

public class AlertQueryParametersDto
{
    public string? Search { get; set; }
    public string? Status { get; set; }
    public string? Severity { get; set; }
    public string? AlertType { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}