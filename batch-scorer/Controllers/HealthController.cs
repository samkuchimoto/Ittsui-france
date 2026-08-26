using Microsoft.AspNetCore.Mvc;

namespace Ittsui.BatchScorer.Controllers;

// A health check is the smallest possible real endpoint — no DTO, no
// service, just "is this process up and answering HTTP requests." It
// looks trivial, but it's exactly what a Kubernetes liveness probe polls
// (a later step in the 30-day plan) to decide whether to restart a
// crashed container, and it's the first thing worth verifying with curl
// after any deploy, before testing anything that actually does work.
[ApiController]
[Route("health")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public ActionResult Get() => Ok(new { status = "ok" });
}
