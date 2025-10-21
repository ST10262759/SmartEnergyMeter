var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

// Enable static files (HTML, CSS, JS)
app.UseStaticFiles();

// Enable default files (index.html)
app.UseDefaultFiles();

// Fallback to index.html for client-side routing
app.MapFallbackToFile("index.html");

app.Run();