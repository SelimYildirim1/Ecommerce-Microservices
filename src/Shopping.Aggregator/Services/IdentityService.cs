using Shopping.Aggregator.Models;
using System.Net.Http.Json;

namespace Shopping.Aggregator.Services;

public interface IIdentityService
{
    Task<List<UserDto>> GetAllUsersAsync();
}

public class IdentityService : IIdentityService
{
    private readonly HttpClient _httpClient;

    public IdentityService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<List<UserDto>> GetAllUsersAsync()
    {
        var result = await _httpClient.GetFromJsonAsync<List<UserDto>>("/api/auth/users");
        return result ?? new List<UserDto>();
    }
}
