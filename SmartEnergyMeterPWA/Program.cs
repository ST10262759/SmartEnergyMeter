var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// Enable static files (HTML, CSS, JS, etc.)
app.UseStaticFiles();

// Configure default files to serve login.html as the default page
app.UseDefaultFiles(new DefaultFilesOptions
{
    DefaultFileNames = new List<string> { "login.html" }
});

// Fallback for SPA routing - serve the appropriate file based on path
app.MapFallback(async context =>
{
    var path = context.Request.Path.Value;

    // If requesting a file with extension, return 404
    if (!string.IsNullOrEmpty(path) && Path.HasExtension(path))
    {
        context.Response.StatusCode = 404;
        return;
    }

    // Check if user is trying to access index (main app)
    if (path != null && (path.Contains("index") || path == "/"))
    {
        var indexPath = Path.Combine(app.Environment.WebRootPath, "index.html");
        if (File.Exists(indexPath))
        {
            context.Response.ContentType = "text/html";
            await context.Response.SendFileAsync(indexPath);
            return;
        }
    }

    // Default to login page for other routes
    context.Response.ContentType = "text/html";
    await context.Response.SendFileAsync("wwwroot/login.html");
});

app.Run();