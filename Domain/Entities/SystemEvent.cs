namespace Domain.Entities;

public class SystemEvent
{
    public int Id { get; set; }
    public string EventType { get; set; } = null!;
    public string PayloadJson { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAtUtc { get; set; }
}
