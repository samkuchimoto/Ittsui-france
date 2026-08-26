using System.ComponentModel.DataAnnotations;

namespace Ittsui.BatchScorer.Dtos;

// A DTO ("Data Transfer Object") describes the shape of data crossing the
// wire — what a caller is allowed to send, not how this service thinks
// about a venue internally. Keeping it separate from any future internal
// "Venue" domain class means the internal model can change shape later
// without silently breaking every client that calls this API — the same
// reason Ittsui's own Next.js API routes validate against a Zod schema
// instead of trusting the raw request body directly.
//
// The [Required]/[RegularExpression] attributes below are "Data
// Annotations" — ASP.NET Core's built-in validation mechanism. Because
// this controller is marked [ApiController] (see
// Controllers/VenueScoresController.cs), the framework validates the
// request against these rules BEFORE the controller method's body even
// runs, and automatically returns a 400 Bad Request with a machine-
// readable error body if validation fails. There is no manual
// `if (!field) return BadRequest(...)` code anywhere for this — it's
// declarative, the same idea as Zod's `.min()`/`.regex()` chains on the
// Next.js side, just enforced by the framework instead of by a library
// you call explicitly.
public class VenueScoreRequest
{
    [Required]
    [MinLength(1)]
    public required string VenueId { get; set; }

    [Required]
    [RegularExpression(
        "^(cafe|restaurant|home|park|museum)$",
        ErrorMessage = "VenueType must be one of: cafe, restaurant, home, park, museum."
    )]
    public required string VenueType { get; set; }

    // Optional, same reasoning as Pair.postalCode on the Next.js side:
    // real coverage is partial, so a missing postal code is a normal,
    // expected input, not an error.
    [RegularExpression(@"^\d{5}$", ErrorMessage = "PostalCode must be exactly 5 digits.")]
    public string? PostalCode { get; set; }
}
