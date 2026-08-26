using System.ComponentModel.DataAnnotations;
using Ittsui.BatchScorer.Dtos;
using Xunit;

namespace Ittsui.BatchScorer.Tests;

// Tests the DTO's Data Annotations directly, via the same Validator API
// ASP.NET Core's [ApiController] pipeline uses internally — without
// starting a web server at all. This is the fast, isolated way to pin
// down validation rules; VenueScoresControllerIntegrationTests below
// covers the same rules again, but through a real HTTP round-trip, which
// is a genuinely different thing to verify (that the rules are actually
// wired up to the endpoint, not just correct in isolation).
public class VenueScoreRequestValidationTests
{
    private static IList<ValidationResult> Validate(VenueScoreRequest request)
    {
        var context = new ValidationContext(request);
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(request, context, results, validateAllProperties: true);
        return results;
    }

    [Fact]
    public void ValidRequest_HasNoValidationErrors()
    {
        var request = new VenueScoreRequest { VenueId = "v1", VenueType = "cafe", PostalCode = "75006" };

        Assert.Empty(Validate(request));
    }

    [Fact]
    public void UnknownVenueType_FailsValidation()
    {
        var request = new VenueScoreRequest { VenueId = "v1", VenueType = "nightclub" };

        var errors = Validate(request);

        Assert.Contains(errors, e => e.MemberNames.Contains(nameof(VenueScoreRequest.VenueType)));
    }

    [Theory]
    [InlineData("7500")] // too short
    [InlineData("750061")] // too long
    [InlineData("7500a")] // not all digits
    public void MalformedPostalCode_FailsValidation(string postalCode)
    {
        var request = new VenueScoreRequest { VenueId = "v1", VenueType = "cafe", PostalCode = postalCode };

        var errors = Validate(request);

        Assert.Contains(errors, e => e.MemberNames.Contains(nameof(VenueScoreRequest.PostalCode)));
    }

    [Fact]
    public void MissingPostalCode_IsValid_BecauseItIsOptional()
    {
        var request = new VenueScoreRequest { VenueId = "v1", VenueType = "cafe" };

        Assert.Empty(Validate(request));
    }
}
