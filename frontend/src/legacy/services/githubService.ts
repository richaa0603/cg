// export interface GitHubRepository {
//   id: number;
//   name: string;
//   full_name: string;
//   description: string | null;
//   html_url: string;
//   language: string | null;
//   stargazers_count: number;
//   owner: {
//     login: string;
//   };
// }

// interface SearchResponse {
//   items: GitHubRepository[];
// }

// export async function searchRepositories(query: string): Promise<GitHubRepository[]> {
//   const normalized = query.trim();

//   if (!normalized) {
//     return [];
//   }

//   const endpoint = `https://api.github.com/search/repositories?q=${encodeURIComponent(normalized)}`;

//   const response = await fetch(endpoint, {
//     headers: {
//       Accept: "application/vnd.github+json",
//     },
//   });

//   if (!response.ok) {
//     throw new Error(`GitHub Search API failed with status ${response.status}`);
//   }

//   const data = (await response.json()) as SearchResponse;
//   return data.items ?? [];
// }
