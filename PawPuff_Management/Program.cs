using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using PawPuff_Management.Models.EfModels;
using PawPuff_Management.Models.Repositories;
using PawPuff_Management.Models.Services;

namespace PawPuff_Management
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container.
            builder.Services.AddControllersWithViews();

			// 註冊DbContext ===========================
			builder.Services.AddDbContext<PawPuffContext>(options =>
			options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

			// 註冊R2圖床
			builder.Services.AddSingleton<Models.Services.R2Service>();

			// 註冊點數規則一覽
			builder.Services.AddScoped<IPointRuleRepository, PointRuleRepository>();
			builder.Services.AddScoped<IPointRuleService, PointRuleService>();

			// 註冊點數變動一覽
			builder.Services.AddScoped<IPointRepository, PointRepository>();
			builder.Services.AddScoped<IPointService, PointService>();

			// 註冊紙娃娃組合預覽
			builder.Services.AddScoped<ICombinationPreviewRepository, CombinationPreviewRepository>();
			builder.Services.AddScoped<ICombinationPreviewService, CombinationPreviewService>();

			//builder.Services.AddScoped<IMemberRepository, MemberRepository>();
			//builder.Services.AddScoped<AuthService>();

			//builder.Services.AddScoped<MemberService>();

			//builder.Services.AddScoped<ProductRepository>();
			//builder.Services.AddScoped<ProductService>();

			// Cookie Authentication ===================
			//builder.Services.AddAuthentication(options =>
			//{
			//	options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme; //"Cookies"名字可自訂
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
