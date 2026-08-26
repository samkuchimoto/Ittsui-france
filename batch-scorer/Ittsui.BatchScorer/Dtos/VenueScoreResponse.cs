namespace Ittsui.BatchScorer.Dtos;

// The OUTBOUND shape — deliberately just as much its own DTO as the
// request, rather than reusing an internal model directly. A response DTO
// is a promise to callers ("this is the contract"), independent of
// however the scoring logic ends up being implemented internally.
public class VenueScoreResponse
{
    public required string VenueId { get; set; }
    public double Score { get; set; }

    // Human-readable, not user-facing — the same "narrate, don't
    // fabricate" instinct as this app's AI-generated confirmation text:
    // when the real scoring logic lands (a later step in the 30-day
    // plan), this should explain what actually drove the number, not a
    // vague placeholder. Nullable so a scorer that has nothing meaningful
    // to say doesn't have to invent something.
    public string? Reason { get; set; }
}
