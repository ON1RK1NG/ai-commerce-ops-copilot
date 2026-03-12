using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace API;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        builder.Services.AddControllers();
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();

        builder.Services.AddDbContext<AppDbContext>(options =>
            options.UseSqlServer(
                builder.Configuration.GetConnectionString("DefaultConnection")));

        builder.Services.AddCors(options =>
        {
            options.AddPolicy("Frontend", policy =>
            {
                policy.WithOrigins(
                        "http://localhost:5173",
                        "http://localhost:5174"
                    )
                    .AllowAnyHeader()
                    .AllowAnyMethod();
            });
        });

        var app = builder.Build();

        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseHttpsRedirection();

        app.UseCors("Frontend");

        app.UseAuthorization();
        app.MapControllers();

        using (var scope = app.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            if (!dbContext.Categories.Any())
            {
                var electronics = new Category { Name = "Electronics" };
                var accessories = new Category { Name = "Accessories" };

                dbContext.Categories.AddRange(electronics, accessories);
                dbContext.SaveChanges();

                var product1 = new Product
                {
                    Sku = "SKU-1001",
                    Name = "Wireless Mouse",
                    Description = "Ergonomic wireless mouse",
                    Price = 25.99m,
                    CategoryId = electronics.Id
                };

                var product2 = new Product
                {
                    Sku = "SKU-1002",
                    Name = "Mechanical Keyboard",
                    Description = "RGB mechanical keyboard",
                    Price = 79.99m,
                    CategoryId = electronics.Id
                };

                dbContext.Products.AddRange(product1, product2);
                dbContext.SaveChanges();

                dbContext.InventoryItems.AddRange(
                    new InventoryItem
                    {
                        ProductId = product1.Id,
                        StockOnHand = 120,
                        StockReserved = 10,
                        ReorderThreshold = 20
                    },
                    new InventoryItem
                    {
                        ProductId = product2.Id,
                        StockOnHand = 45,
                        StockReserved = 5,
                        ReorderThreshold = 15
                    });

                dbContext.SaveChanges();
            }
        }

        app.Run();
    }
}