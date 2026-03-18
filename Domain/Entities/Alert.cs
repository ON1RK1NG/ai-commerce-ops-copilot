namespace Domain.Entities;

public class Alert
{
    public int Id { get; set; }

    public int? ProductId { get; set; }
    public Product? Product { get; set; }

    public string AlertType { get; set; } = null!;
    public string Severity { get; set; } = "warning";
    public string Title { get; set; } = null!;
    public string Description { get; set; } = null!;

    public bool IsAcknowledged { get; set; }
    public bool IsResolved { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? AcknowledgedAtUtc { get; set; }
    public DateTime? ResolvedAtUtc { get; set; }
}