using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions options) : base(options)
    {
    }

    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<InventoryItem> InventoryItems => Set<InventoryItem>();
    public DbSet<InventoryMovement> InventoryMovements => Set<InventoryMovement>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<SystemEvent> SystemEvents => Set<SystemEvent>();
    public DbSet<Alert> Alerts => Set<Alert>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Category>(builder =>
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Name)
                .IsRequired()
                .HasMaxLength(100);
        });

        modelBuilder.Entity<Product>(builder =>
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Sku)
                .IsRequired()
                .HasMaxLength(50);

            builder.Property(x => x.Name)
                .IsRequired()
                .HasMaxLength(200);

            builder.Property(x => x.Description)
                .HasMaxLength(1000);

            builder.Property(x => x.Price)
                .HasColumnType("decimal(18,2)");

            builder.Property(x => x.IsActive)
                .IsRequired();

            builder.Property(x => x.CreatedAtUtc)
                .IsRequired();

            builder.HasIndex(x => x.Sku)
                .IsUnique();

            builder.HasOne(x => x.Category)
                .WithMany(x => x.Products)
                .HasForeignKey(x => x.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(x => x.InventoryItem)
                .WithOne(x => x.Product)
                .HasForeignKey<InventoryItem>(x => x.ProductId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasMany(x => x.InventoryMovements)
                .WithOne(x => x.Product)
                .HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasMany(x => x.OrderItems)
                .WithOne(x => x.Product)
                .HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<InventoryItem>(builder =>
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.StockOnHand)
                .IsRequired();

            builder.Property(x => x.StockReserved)
                .IsRequired();

            builder.Property(x => x.ReorderThreshold)
                .IsRequired();

            builder.Property(x => x.UpdatedAtUtc)
                .IsRequired();

            builder.HasIndex(x => x.ProductId)
                .IsUnique();
        });

        modelBuilder.Entity<InventoryMovement>(builder =>
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.MovementType)
                .IsRequired()
                .HasMaxLength(50);

            builder.Property(x => x.Quantity)
                .IsRequired();

            builder.Property(x => x.Reason)
                .HasMaxLength(500);

            builder.Property(x => x.StockOnHandAfter)
                .IsRequired();

            builder.Property(x => x.StockReservedAfter)
                .IsRequired();

            builder.Property(x => x.CreatedAtUtc)
                .IsRequired();

            builder.HasIndex(x => x.ProductId);
            builder.HasIndex(x => x.CreatedAtUtc);
        });

        modelBuilder.Entity<Order>(builder =>
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.OrderNumber)
                .IsRequired()
                .HasMaxLength(50);

            builder.Property(x => x.Status)
                .IsRequired()
                .HasMaxLength(50);

            builder.Property(x => x.PaymentStatus)
                .IsRequired()
                .HasMaxLength(50);

            builder.Property(x => x.TotalAmount)
                .HasColumnType("decimal(18,2)");

            builder.Property(x => x.CustomerCountry)
                .HasMaxLength(100);

            builder.Property(x => x.Market)
                .HasMaxLength(100);

            builder.Property(x => x.CreatedAtUtc)
                .IsRequired();

            builder.HasIndex(x => x.OrderNumber)
                .IsUnique();

            builder.HasMany(x => x.Items)
                .WithOne(x => x.Order)
                .HasForeignKey(x => x.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<OrderItem>(builder =>
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.Quantity)
                .IsRequired();

            builder.Property(x => x.UnitPrice)
                .HasColumnType("decimal(18,2)");

            builder.Property(x => x.LineTotal)
                .HasColumnType("decimal(18,2)");

            builder.HasIndex(x => x.OrderId);
            builder.HasIndex(x => x.ProductId);
        });

        modelBuilder.Entity<SystemEvent>(builder =>
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.EventType)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(x => x.PayloadJson)
                .IsRequired();

            builder.Property(x => x.CreatedAtUtc)
                .IsRequired();

            builder.HasIndex(x => x.EventType);
            builder.HasIndex(x => x.CreatedAtUtc);
        });

        modelBuilder.Entity<Alert>(builder =>
        {
            builder.HasKey(x => x.Id);

            builder.Property(x => x.AlertType)
                .IsRequired()
                .HasMaxLength(50);

            builder.Property(x => x.Severity)
                .IsRequired()
                .HasMaxLength(20);

            builder.Property(x => x.Title)
                .IsRequired()
                .HasMaxLength(200);

            builder.Property(x => x.Description)
                .IsRequired()
                .HasMaxLength(1000);

            builder.Property(x => x.CreatedAtUtc)
                .IsRequired();

            builder.HasIndex(x => x.AlertType);
            builder.HasIndex(x => x.Severity);
            builder.HasIndex(x => x.IsAcknowledged);
            builder.HasIndex(x => x.IsResolved);
            builder.HasIndex(x => x.CreatedAtUtc);

            builder.HasOne(x => x.Product)
                .WithMany()
                .HasForeignKey(x => x.ProductId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }
}