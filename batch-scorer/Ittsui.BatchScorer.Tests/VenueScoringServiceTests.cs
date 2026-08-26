using Ittsui.BatchScorer.Dtos;
using Ittsui.BatchScorer.Services;
using Xunit;

namespace Ittsui.BatchScorer.Tests;

// Unit test: exercises VenueScoringService in complete isolation — no
// HTTP, no ASP.NET Core hosting, just "new it up and call the method."
// This is what "clean service boundaries" actually buys you: because the
// controller depends on IVenueScoringService rather than doing its own
// scoring, the scoring logic itself is testable without spinning up a web
// server at all.
public class VenueScoringServiceTests
{
    [Fact]
    public void Score_EchoesTheRequestedVenueId()
    {
        var service = new VenueScoringService();
        var request = new VenueScoreRequest { VenueId = "cafe-de-flore-01", VenueType = "cafe" };

        var result = service.Score(request);

        Assert.Equal("cafe-de-flore-01", result.VenueId);
    }

    [Fact]
    public void Score_ReturnsAScoreWithinTheValidZeroToOneRange()
    {
        var service = new VenueScoringService();
        var request = new VenueScoreRequest { VenueId = "x", VenueType = "restaurant" };

        var result = service.Score(request);

        Assert.InRange(result.Score, 0.0, 1.0);
    }
}
