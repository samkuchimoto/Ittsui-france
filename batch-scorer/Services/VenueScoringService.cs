using Ittsui.BatchScorer.Dtos;

namespace Ittsui.BatchScorer.Services;

// Placeholder implementation on purpose — real batch-scoring logic
// (venue popularity/freshness by category/postal code, fed by the
// Python ingestion step) is a LATER item in the 30-day plan, not this
// one. This step's actual goal is proving the pipeline works end to end:
// HTTP request -> validated DTO -> controller -> service -> DTO -> HTTP
// response. Swapping this method's body for something real later never
// requires touching the controller, precisely because the controller
// only knows about IVenueScoringService, not this class.
public class VenueScoringService : IVenueScoringService
{
    public VenueScoreResponse Score(VenueScoreRequest request)
    {
        return new VenueScoreResponse
        {
            VenueId = request.VenueId,
            Score = 0.5,
            Reason = "placeholder — real scoring logic not implemented yet",
        };
    }
}
