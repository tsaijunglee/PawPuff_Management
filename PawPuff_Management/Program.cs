using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using PawPuff_Management.Models.Authorization;
using PawPuff_Management.Models.EfModels;
using PawPuff_Management.Models.Repositories;
using PawPuff_Management.Models.Services;
using System.Net;
using System.Security.Claims;

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

			// 註冊 管理員資料  Admin = Repo & Service ===========================
			builder.Services.AddScoped<AdminRepository>();
			builder.Services.AddScoped<AdminService>();


			// 註冊 管理員打卡  AdminClock = Repo & Service ===========================
			builder.Services.AddScoped<AdminClockRepository>();
			builder.Services.AddScoped<AdminClockService>();


			// 註冊 Policy  權限跳轉用 ===========================
			builder.Services.AddAuthorization(options =>
			{
				foreach (var permission in Permissions.All)
				{
					options.AddPolicy(permission, policy =>
					{
						policy.RequireClaim("Permission", permission);
					});
				}
			});




			// 註冊 會員資料  User = Repo & Service ===========================
			builder.Services.AddScoped<UserRepository>();
			builder.Services.AddScoped<UserService>();






			// 註冊R2圖床
			builder.Services.AddSingleton<Models.Services.R2Service>();

			// 註冊持有商品一覽
			builder.Services.AddScoped<IOwnedProductRepository, OwnedProductRepository>();
			builder.Services.AddScoped<IOwnedProductService, OwnedProductService>();

			// 註冊點數規則一覽
			builder.Services.AddScoped<IPointRuleRepository, PointRuleRepository>();
			builder.Services.AddScoped<IPointRuleService, PointRuleService>();

			// 註冊點數變動一覽
			builder.Services.AddScoped<IPointRepository, PointRepository>();
			builder.Services.AddScoped<IPointService, PointService>();

			// 註冊持有組合一覽
			builder.Services.AddScoped<IOwnedCombinationRepository,OwnedCombinationRepository>();
			builder.Services.AddScoped<IOwnedCombinationService,OwnedCombinationService>();

			// 註冊紙娃娃組合預覽
			builder.Services.AddScoped<ICombinationPreviewRepository, CombinationPreviewRepository>();
			builder.Services.AddScoped<ICombinationPreviewService, CombinationPreviewService>();




			//builder.Services.AddScoped<IMemberRepository, MemberRepository>();
			//builder.Services.AddScoped<AuthService>();
            // 商城管理三層式架構註冊。
            // ShopRepository：資料庫存取。
            // ShopImageService：商城圖片 URL 組合與呼叫既有 R2Service 上傳。
            // ShopService：商業流程與 DTO 轉換。
            builder.Services.AddScoped<IShopRepository, ShopRepository>();
            builder.Services.AddScoped<IShopImageService, ShopImageService>();
            builder.Services.AddScoped<IShopService, ShopService>();

            //builder.Services.AddScoped<IMemberRepository, MemberRepository>();
            //builder.Services.AddScoped<AuthService>();

            //builder.Services.AddScoped<MemberService>();

			// 目前操作者(開發用假身分;之後接上登入只換這一行的實作)
			builder.Services.AddScoped<ICurrentUserService, DevCurrentUserService>();

			// 分類
			builder.Services.AddScoped<IArticleCategoryRepository, ArticleCategoryRepository>();
			builder.Services.AddScoped<IArticleCategoryService, ArticleCategoryService>();

			// 文章 + 圖片 + 留言 + 按讚/收藏
			builder.Services.AddScoped<IArticleRepository, ArticleRepository>();
			builder.Services.AddScoped<IArticleImageRepository, ArticleImageRepository>();
			builder.Services.AddScoped<ICommentRepository, CommentRepository>();
			builder.Services.AddScoped<IArticleReactionRepository, ArticleReactionRepository>();

			builder.Services.AddScoped<IArticleService, ArticleService>();
			builder.Services.AddScoped<IArticleImageService, ArticleImageService>();
			builder.Services.AddScoped<ICommentService, CommentService>();
			builder.Services.AddScoped<IArticleReactionService, ArticleReactionService>();

			// Fqa註冊
			builder.Services.AddScoped<IFaqRepository, FaqRepository>();
			builder.Services.AddScoped<IFaqService, FaqService>();


			//builder.Services.AddScoped<ProductRepository>();
			//builder.Services.AddScoped<ProductService>();





			// Cookie Authentication ===================
			builder.Services.AddAuthentication(options =>
			{
				options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme; //"Cookies"名字可自訂
				options.DefaultChallengeScheme = CookieAuthenticationDefaults.AuthenticationScheme;

			})
				.AddCookie(options =>
				{
					options.Cookie.Name = "PawPuff_Management"; // Set cookie name

													
					options.LoginPath = "/Auth/Index"; // Set login path
													   //使用者還沒登入


					//已經登入，但沒有權限時，要導向哪一個頁面
					options.AccessDeniedPath = "/Error/AccessDenied"; // Set access denied path

					options.ExpireTimeSpan = TimeSpan.FromMinutes(60); // Set cookie expiration time
																	   //設定登入有效期限為目前 UTC 時間的一小時後 => 過期後使用者需要重新登入

					options.SlidingExpiration = true; //管理員持續操作網站時，Cookie 的有效期限可以向後延長
													  // Enable sliding expiration

				});


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

			app.UseAuthentication();
			app.UseAuthorization();

            app.MapControllerRoute(
                name: "default",
                pattern: "{controller=Home}/{action=Index}/{id?}");

            app.Run();
        }
    }
}
