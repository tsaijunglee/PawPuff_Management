using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using PawPuff_Management.Models.EfModels;

namespace PawPuff_Management
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container.
            builder.Services.AddControllersWithViews();

			// µù¥UDbContext ===========================
			builder.Services.AddDbContext<PawPuffContext>(options =>
			options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

			//builder.Services.AddScoped<IMemberRepository, MemberRepository>();
			//builder.Services.AddScoped<AuthService>();

			//builder.Services.AddScoped<MemberService>();

			//builder.Services.AddScoped<ProductRepository>();
			//builder.Services.AddScoped<ProductService>();

			// Cookie Authentication ===================
			//builder.Services.AddAuthentication(options =>
			//{
			//	options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme; //"Cookies"¦W¦r¥i¦Û­q
			//	options.DefaultChallengeScheme = CookieAuthenticationDefaults.AuthenticationScheme;

			//})
			//	.AddCookie(options =>
			//	{
			//		options.Cookie.Name = "estore"; // Set cookie name
			//		options.LoginPath = "/Auth/Login"; // Set login path
			//										   // options.AccessDeniedPath = "/Auth/AccessDenied"; // Set access denied path
			//		options.ExpireTimeSpan = TimeSpan.FromMinutes(60); // Set cookie expiration time
			//		options.SlidingExpiration = true; // Enable sliding expiration
			//	});

			//==========================================

			var app = builder.Build();

            // Configure the HTTP request pipeline.
            if (!app.Environment.IsDevelopment())
            {
                app.UseExceptionHandler("/Home/Error");
                // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
                app.UseHsts();
            }

            app.UseHttpsRedirection();
            app.UseStaticFiles();

            app.UseRouting();

            app.UseAuthorization();

            app.MapControllerRoute(
                name: "default",
                pattern: "{controller=Home}/{action=Index}/{id?}");

            app.Run();
        }
    }
}
