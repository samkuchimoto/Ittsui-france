using Ittsui.BatchScorer.Dtos;

namespace Ittsui.BatchScorer.Services;

// The interface is the actual "clean service boundary" — a controller
// depends on THIS, never on VenueScoringService directly. That's what
// makes the concrete implementation swappable later (a real database-
// backed scorer instead of today's placeholder) without touching the
// controller at all, and it's what makes the controller testable without
// spinning up real scoring logic in a unit test.
public interface IVenueScoringService
{
    VenueScoreResponse Score(VenueScoreRequest request);
}
