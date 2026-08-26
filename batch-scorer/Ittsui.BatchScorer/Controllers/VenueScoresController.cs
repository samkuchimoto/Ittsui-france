using Microsoft.AspNetCore.Mvc;
using Ittsui.BatchScorer.Dtos;
using Ittsui.BatchScorer.Services;

namespace Ittsui.BatchScorer.Controllers;

// [ApiController] turns on several conveniences at once: automatic 400
// responses on a failed model-validation (see VenueScoreRequest's
// annotations), automatic binding of a JSON body to [FromBody] parameters,
// and inference of where parameters come from without extra attributes in
// simple cases. [Route("api/venue-scores")] is this controller's base
// path — combined with [HttpPost] below with no extra segment, this
// method answers POST /api/venue-scores.
//
// The controller itself is intentionally thin: no scoring logic lives
// here. Its only job is translating an HTTP request into a call to
// IVenueScoringService and translating that result back into an HTTP
// response — "clean service boundaries" means the controller is a
// translator at the edge, not where business logic lives.
[ApiController]
[Route("api/venue-scores")]
public class VenueScoresController : ControllerBase
{
    private readonly IVenueScoringService _scoringService;

    // Constructor injection: ASP.NET Core's built-in dependency injection
    // container hands this controller an IVenueScoringService instance
    // automatically on every request, because Program.cs registers the
    // mapping (interface -> concrete class) once at startup. Nothing in
    // this file ever writes `new VenueScoringService()` — that's the
    // whole point of depending on the interface instead.
    public VenueScoresController(IVenueScoringService scoringService)
    {
        _scoringService = scoringService;
    }

    [HttpPost]
    public ActionResult<VenueScoreResponse> Score([FromBody] VenueScoreRequest request)
    {
        var result = _scoringService.Score(request);
        return Ok(result);
    }
}
