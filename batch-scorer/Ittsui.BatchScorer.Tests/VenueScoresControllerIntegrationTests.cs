using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Ittsui.BatchScorer.Dtos;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Ittsui.BatchScorer.Tests;

// Integration test: spins up the ENTIRE app in-memory (real routing, real
// [ApiController] validation pipeline, real dependency injection wiring
// from Program.cs) via WebApplicationFactory, then sends real HTTP
// requests to it. Unlike the unit tests above, this would actually catch
// a mistake in how Program.cs wires things together — a missing
// AddScoped<>() registration, a wrong [Route] attribute, a typo in the
// URL — none of which the isolated unit tests could ever see, since they
// never touch routing or DI at all.
public class VenueScoresControllerIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public VenueScoresControllerIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Health_ReturnsOk()
    {
        var response = await _client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task PostVenueScores_WithValidBody_Returns200AndTheScoredVenue()
    {
        var response = await _client.PostAsJsonAsync(
            "/api/venue-scores",
            new { venueId = "cafe-de-flore-01", venueType = "cafe", postalCode = "75006" }
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<VenueScoreResponse>();
        Assert.NotNull(body);
        Assert.Equal("cafe-de-flore-01", body!.VenueId);
    }

    [Fact]
    public async Task PostVenueScores_WithInvalidVenueType_Returns400WithFieldError()
    {
        var response = await _client.PostAsJsonAsync(
            "/api/venue-scores",
            new { venueId = "x", venueType = "nightclub" }
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.True(doc.RootElement.GetProperty("errors").TryGetProperty("VenueType", out _));
    }

    [Fact]
    public async Task PostVenueScores_MissingVenueId_Returns400()
    {
        var response = await _client.PostAsJsonAsync("/api/venue-scores", new { venueType = "cafe" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
