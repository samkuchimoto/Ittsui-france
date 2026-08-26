using Ittsui.BatchScorer.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();

// This is the actual wiring for "clean service boundaries": registering
// the interface -> concrete class mapping ONCE, here, is what lets every
// controller depend only on IVenueScoringService and never know
// VenueScoringService exists. AddScoped means one instance per incoming
// HTTP request — the right lifetime for something with no state to share
// across requests, as opposed to AddSingleton (one instance for the whole
// app's lifetime) or AddTransient (a new instance every time it's asked
// for, even twice in the same request).
builder.Services.AddScoped<IVenueScoringService, VenueScoringService>();

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthorization();

app.MapControllers();

app.Run();

// .NET's top-level-statement Program.cs compiles to an INTERNAL Program
// class by default — invisible outside this assembly. The integration
// tests in Ittsui.BatchScorer.Tests need WebApplicationFactory<Program> to
// spin up this exact app in-memory, from a different assembly, which
// requires Program to be public. This partial declaration is the
// well-known, minimal fix — it doesn't change anything about how the app
// actually runs, only what's visible to the test project.
public partial class Program { }
