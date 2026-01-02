import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";

export async function GET(request: NextRequest) {
  try {
    // Use regular client to get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is superadmin or admin (use service role for query)
    const serviceSupabase = createServiceRoleClient();
    const { data: roles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const roleList = roles?.map((r: { role: string }) => r.role) || [];
    const isSuperadmin = roleList.includes("superadmin");
    const isAdmin = roleList.includes("admin");
    if (!isSuperadmin && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const type = searchParams.get("type") || "user";

    if (query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const results: any[] = [];

    if (type === "user") {
      // Search users by email - use admin API to list users
      const { data: usersData, error: usersError } =
        await serviceSupabase.auth.admin.listUsers({ perPage: 100 });

      if (!usersError && usersData?.users) {
        const matchingUsers = usersData.users.filter(
          (u) =>
            u.email?.toLowerCase().includes(query.toLowerCase()) ||
            u.user_metadata?.name?.toLowerCase().includes(query.toLowerCase())
        );

        // Get profile info for matching users
        for (const authUser of matchingUsers.slice(0, 20)) {
          const { data: profile } = await serviceSupabase
            .from("user_profiles")
            .select("name, surname")
            .eq("id", authUser.id)
            .single();

          results.push({
            type: "user",
            id: authUser.id,
            name: profile?.name
              ? `${profile.name} ${profile.surname || ""}`.trim()
              : authUser.email,
            email: authUser.email,
          });
        }
      }
    } else {
      // Search entities and their attached users
      const queryLower = query.toLowerCase();
      
      // Get all users once to avoid multiple API calls (shared across all entity searches)
      let allAuthUsers: any[] = [];
      try {
        const { data: usersData, error: usersError } = await serviceSupabase.auth.admin.listUsers({ perPage: 1000 });
        if (!usersError && usersData?.users) {
          allAuthUsers = usersData.users;
        }
      } catch (authError: any) {
        console.error("Error fetching users (non-critical):", authError);
        // Continue without user data - we can still return entity results
      }
      
      // Search venues - simplified, return venues even without attached users
      try {
        const { data: venues, error: venuesError } = await supabase
          .from("venues")
          .select("id, name, email")
          .or(`name.ilike.%${queryLower}%,email.ilike.%${queryLower}%`)
          .limit(10);

        if (venuesError) {
          console.error("Error searching venues:", venuesError);
        } else if (venues && venues.length > 0) {

          for (const venue of venues) {
            const attachedUsers: any[] = [];
            
            try {
              const { data: venueUsers } = await supabase
                .from("venue_users")
                .select("user_id, role")
                .eq("venue_id", venue.id);

              if (venueUsers && allAuthUsers.length > 0) {
                for (const vu of venueUsers) {
                  try {
                    const authUser = allAuthUsers.find((u) => u.id === vu.user_id);
                    if (authUser) {
                      const { data: profile } = await supabase
                        .from("user_profiles")
                        .select("name, surname")
                        .eq("id", authUser.id)
                        .maybeSingle();

                      attachedUsers.push({
                        id: authUser.id,
                        email: authUser.email,
                        name: profile?.name
                          ? `${profile.name} ${profile.surname || ""}`.trim()
                          : undefined,
                        role: vu.role,
                      });
                    }
                  } catch (userError) {
                    console.error("Error processing user:", userError);
                    // Continue with next user
                  }
                }
              }
            } catch (venueUsersError) {
              console.error("Error fetching venue users:", venueUsersError);
              // Continue without attached users
            }

            results.push({
              type: "venue",
              id: venue.id,
              name: venue.name,
              email: venue.email,
              attachedUsers,
            });
          }
        }
      } catch (venueSearchError: any) {
        console.error("Error in venue search:", venueSearchError);
        // Continue to search other entity types
      }

      // Search organizers
      try {
        const { data: organizers, error: organizersError } = await supabase
          .from("organizers")
          .select("id, name, email")
          .or(`name.ilike.%${queryLower}%,email.ilike.%${queryLower}%`)
          .limit(10);

        if (organizersError) {
          console.error("Error searching organizers:", organizersError);
        } else if (organizers && organizers.length > 0) {
          for (const org of organizers) {
            const attachedUsers: any[] = [];
            try {
              const { data: orgUsers } = await supabase
                .from("organizer_users")
                .select("user_id, role")
                .eq("organizer_id", org.id);

              if (orgUsers && allAuthUsers.length > 0) {
                for (const ou of orgUsers) {
                  try {
                    const authUser = allAuthUsers.find((u) => u.id === ou.user_id);
                    if (authUser) {
                      const { data: profile } = await supabase
                        .from("user_profiles")
                        .select("name, surname")
                        .eq("id", authUser.id)
                        .maybeSingle();

                      attachedUsers.push({
                        id: authUser.id,
                        email: authUser.email,
                        name: profile?.name
                          ? `${profile.name} ${profile.surname || ""}`.trim()
                          : undefined,
                        role: ou.role,
                      });
                    }
                  } catch (userError) {
                    // Continue with next user
                  }
                }
              }
            } catch (orgUsersError) {
              // Continue without attached users
            }

            results.push({
              type: "organizer",
              id: org.id,
              name: org.name,
              email: org.email,
              attachedUsers,
            });
          }
        }
      } catch (organizerSearchError) {
        console.error("Error in organizer search:", organizerSearchError);
      }

      // Search promoters
      try {
        const { data: promoters, error: promotersError } = await supabase
          .from("promoters")
          .select("id, name, email, user_id")
          .or(`name.ilike.%${queryLower}%,email.ilike.%${queryLower}%`)
          .limit(10);

        if (promotersError) {
          console.error("Error searching promoters:", promotersError);
        } else if (promoters && promoters.length > 0) {
          for (const promoter of promoters) {
            const attachedUsers: any[] = [];
            try {
              if (promoter.user_id && allAuthUsers.length > 0) {
                const authUser = allAuthUsers.find((u) => u.id === promoter.user_id);
                if (authUser) {
                  const { data: profile } = await supabase
                    .from("user_profiles")
                    .select("name, surname")
                    .eq("id", authUser.id)
                    .maybeSingle();

                  attachedUsers.push({
                    id: authUser.id,
                    email: authUser.email,
                    name: profile?.name
                      ? `${profile.name} ${profile.surname || ""}`.trim()
                      : undefined,
                    role: "owner",
                  });
                }
              }
            } catch (promoterUserError) {
              // Continue without attached user
            }

            results.push({
              type: "promoter",
              id: promoter.id,
              name: promoter.name,
              email: promoter.email,
              attachedUsers,
            });
          }
        }
      } catch (promoterSearchError) {
        console.error("Error in promoter search:", promoterSearchError);
      }

      // Search DJs
      try {
        const { data: djs, error: djsError } = await supabase
          .from("djs")
          .select("id, name, handle, user_id")
          .or(`name.ilike.%${queryLower}%,handle.ilike.%${queryLower}%`)
          .limit(10);

        if (djsError) {
          console.error("Error searching DJs:", djsError);
        } else if (djs && djs.length > 0) {
          for (const dj of djs) {
            const attachedUsers: any[] = [];
            try {
              if (dj.user_id && allAuthUsers.length > 0) {
                const authUser = allAuthUsers.find((u) => u.id === dj.user_id);
                if (authUser) {
                  const { data: profile } = await supabase
                    .from("user_profiles")
                    .select("name, surname")
                    .eq("id", authUser.id)
                    .maybeSingle();

                  attachedUsers.push({
                    id: authUser.id,
                    email: authUser.email,
                    name: profile?.name
                      ? `${profile.name} ${profile.surname || ""}`.trim()
                      : undefined,
                    role: "owner",
                  });
                }
              }
            } catch (djUserError) {
              // Continue without attached user
            }

            results.push({
              type: "dj",
              id: dj.id,
              name: dj.name,
              email: dj.handle ? `@${dj.handle}` : undefined,
              attachedUsers,
            });
          }
        }
      } catch (djSearchError) {
        console.error("Error in DJ search:", djSearchError);
      }
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("Search error:", error);
    console.error("Error stack:", error?.stack);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

