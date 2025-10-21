var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// Enable static files (HTML, CSS, JS, etc.)
app.UseStaticFiles();

// Configure default files to serve login.html as the default page
app.UseDefaultFiles(new DefaultFilesOptions
{
    DefaultFileNames = new List<string> { "login.html" }
});

// Map specific route for root to serve login.html
app.MapGet("/", async context =>
{
    context.Response.ContentType = "text/html";
    await context.Response.SendFileAsync("wwwroot/login.html");
});

// Optional: Explicitly map /login route
app.MapGet("/login", async context =>
{
    context.Response.ContentType = "text/html";
    await context.Response.SendFileAsync("wwwroot/login.html");
});

// Optional: Explicitly map /index route (protected by client-side auth)
app.MapGet("/index", async context =>
{
    context.Response.ContentType = "text/html";
    await context.Response.SendFileAsync("wwwroot/index.html");
});

// Fallback for all other routes - serve login.html for unmatched routes
app.MapFallback(async context =>
{
    // Check if the request is for a static file (has extension)
    var path = context.Request.Path.Value;
    if (!string.IsNullOrEmpty(path) && Path.HasExtension(path))
    {
        // Let static files middleware handle it (404 if not found)
        context.Response.StatusCode = 404;
        return;
    }

    // For routes without extensions, serve login.html
    context.Response.ContentType = "text/html";
    await context.Response.SendFileAsync("wwwroot/login.html");
});

app.Run();