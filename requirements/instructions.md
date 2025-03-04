#Project Overview (nice)
Use this guide to build PokemonFusion.com an innovative web application designed to provide Pokémon enthusiasts with a unique platform to create, share, and explore custom Pokémon fusions. By leveraging advanced AI image generation technology from a model hosted on Replicate, users can select two distinct Pokémon and seamlessly blend them into a brand-new, original creature. The platform offers an engaging and interactive experience, allowing users to save their favorite fusions and share them across various social media platforms.

You will be using Next.js, Shadcn UI, Tailwind CSS, Lucid icon, Supabase and Clerk for authentication.

# Core Functionalities:
1. Pokémon Selection: Users can randomly select two different Pokémon from the Pokédex or manually choose their favorites, via The RESTful Pokémon API.
2. AI-Powered Fusion: The platform utilizes an AI image generation model by calling an API on Replicate to create a unique, blended Pokémon based on the selected pair.
3. Nice UI animation: Display a nice UI loading animation when the image is loading or the generation is processing.
4. Save to Favorites & Download: Users can save their favorite Pokémon fusions in a personal collection for future viewing or even download the image. The icons for these actions should appear when the user hoovers over the image.
5. Social Media Sharing: A dedicated share button allows users to post their creations on social platforms like Twitter, Instagram, and Discord.
6. Responsive Design: The website is optimized for both desktop and mobile devices, ensuring a smooth and engaging experience.
7. Dark Mode: Users can toggle between light and dark mode for a more personalized visual experience.
8. Fusion History: A log of recently created fusions is available for users to revisit or get inspiration from other generated Pokémon.
9. Community Voting & Engagement: Users can like and comment on fusion creations, promoting the most creative Pokémon to a trending section.
10. Authentication & User Profiles: Users can sign up, log in, and manage their favorite fusions through a profile system via Clerk.
11. Google Tag Manager & Analytics: Track user engagement and optimize the platform using data-driven insights.
12. Search & Discovery: Users can explore a database of previously generated fusions by searching Pokémon names or fusion themes.
13. Web Push Notifications: Notify users when new fusion features or trending Pokémon combinations are available via OneSignal.

#Data Structure:
Relationships
users → fusions (1:N) → Each user can create multiple fusions.
pokemon → fusions (N:N) → Each fusion involves two Pokémon.
users → favorites (1:N) → Users can save multiple favorite fusions.
users → comments (1:N) → Users can comment on different fusions.
users → social_shares (1:N) → Users can share fusions on social media.
Bonus: API Endpoints
Using Supabase REST API or PostgREST, your API endpoints could look like:

Get all Pokémon: GET /pokemon
Create a fusion: POST /fusions
Get fusions by user: GET /fusions?user_id=eq.{user_id}
Like a fusion: PATCH /fusions/{fusion_id}
Get favorite fusions: GET /favorites?user_id=eq.{user_id}
Add a comment: POST /comments
Share a fusion: POST /social_shares


# Relevant Docs:
- The RESTful Pokémon API: https://pokeapi.co/docs/v2
    https://pokeapi.co/api/v2/
    pokemon/ditto

    Submit
    Need a hint? Try pokemon/ditto, pokemon-species/aegislash, type/3, ability/battle-armor, or pokemon?limit=100000&offset=0.

    Direct link to results: https://pokeapi.co/api/v2/pokemon/ditto

    Resource for ditto
    name:"limber"
    url:"https://pokeapi.co/api/v2/ability/7/"
    is_hidden:false
    slot:1
    name:"imposter"
    url:"https://pokeapi.co/api/v2/ability/150/"
    is_hidden:true
    slot:3
    base_experience:101
    latest:"https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/132.ogg"
    legacy:"https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/legacy/132.ogg"
    name:"ditto"
    url:"https://pokeapi.co/api/v2/pokemon-form/132/"
    height:3
    name:"metal-powder"
    url:"https://pokeapi.co/api/v2/item/234/"
    name:"quick-powder"
    url:"https://pokeapi.co/api/v2/item/251/"
    id:132
    is_default:true
    location_area_encounters:"https://pokeapi.co/api/v2/pokemon/132/encounters"
    name:"transform"
    url:"https://pokeapi.co/api/v2/move/144/"
    name:"ditto"
    order:214
    past_abilities:
    past_types:
    name:"ditto"
    url:"https://pokeapi.co/api/v2/pokemon-species/132/"
    slot:1
    name:"normal"
    url:"https://pokeapi.co/api/v2/type/1/"
    weight:40


- Replicate:
How to use replicate image-merger generator model:
    Set the REPLICATE_API_TOKEN environment variable

    export REPLICATE_API_TOKEN=r8_bJG**********************************

    Visibility

    Copy
    Learn more about authentication

    Install Replicate’s Node.js client library

    npm install replicate

    Copy
    Learn more about setup
    Run fofr/image-merger using Replicate’s API. Check out the model's schema for an overview of inputs and outputs.

    import Replicate from "replicate";
    const replicate = new Replicate();

    const input = {
        prompt: "an svg illustration, sharp, solid color, thick outline",
        image_1: "https://replicate.delivery/pbxt/KLpMSbIo0rCeITgKcB6CPTsfUbSquTptlLHOR7SyDBiaUBUS/0_2.webp",
        image_2: "https://replicate.delivery/pbxt/KLpMTQ754bUSZlPnrYog5JFI0mRGVoXAkQSlPk1yfHssW532/0_2-1.webp",
        merge_mode: "left_right",
        upscale_2x: true,
        control_image: "https://replicate.delivery/pbxt/KLpMSa1lK4SMNxrhDnXFkk6BYkpIZVVXg3WrQIlLPCUn4Uaw/0_3.webp",
        negative_prompt: "garish, soft, ugly, broken, distorted"
    };

    const output = await replicate.run("fofr/image-merger:db2c826b6a7215fd31695acb73b5b2c91a077f88a2a264c003745e62901e2867", { input });

    import { writeFile } from "node:fs/promises";
    for (const [index, item] of Object.entries(output)) {
    await writeFile(`output_${index}.png`, item);
    }
    //=> output_0.png written to disk



- Clerk: https://clerk.com/docs/components/overview
    Install @clerk/nextjs
    The package to use with Clerk and NextJS.

    bashCopynpm install @clerk/nextjs

    Set your environment variables
    Add these keys to your .env.local or create the file if it doesn't exist. Retrieve these keys anytime from the API keys page.

    .env.local
    CopyNEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_bGl2aW5nLWJhc3MtNTAuY2xlcmsuYWNjb3VudHMuZGV2JA
    CLERK_SECRET_KEY=••••••••••••••••••••••••••••••••••••••••••••••••••

    Update middleware.ts
    Update your middleware file or create one at the root of your project or src/ directory if you're using a src/ directory structure.
    The clerkMiddleware helper enables authentication and is where you'll configure your protected routes.

    middleware.ts
    typescriptCopyimport { clerkMiddleware } from "@clerk/nextjs/server";

    export default clerkMiddleware();

    export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
    };

    Add ClerkProvider to your app
    All Clerk hooks and components must be children of the ClerkProvider component.
    You can control which content signed in and signed out users can see with Clerk's prebuilt components.

    /src/app/layout.tsx
    typescriptCopyimport {
    ClerkProvider,
    SignInButton,
    SignedIn,
    SignedOut,
    UserButton
    } from '@clerk/nextjs'
    import './globals.css'

    export default function RootLayout({
    children,
    }: {
    children: React.ReactNode
    }) {
    return (
        <ClerkProvider>
        <html lang="en">
            <body>
            <SignedOut>
                <SignInButton />
            </SignedOut>
            <SignedIn>
                <UserButton />
            </SignedIn>
            {children}
            </body>
        </html>
        </ClerkProvider>
    )
    }

    Create your first user
    Run your project. Then, visit your app's homepage at http://localhost:3000 and sign up to create your first user.

    bashCopynpm run dev

    Next steps

    Utilize your own pages for authentication
    The account portal is the fastest way to add authentication, but Clerk has pre-built, customizable components to use in your app too.
    Continue to the Next.js guide

- Supabase: https://supabase.com/docs/guides/auth/auth-helpers/nextjs
I have already created the supabase project and the database, with the following tables: 
        
    1. Create users Table
    This table stores user authentication and profile details.
    CREATE TABLE Users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
    )

    2. Create fusions Table
    Stores AI-generated Pokémon fusions.
    CREATE TABLE fusions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        fusion_name TEXT NOT NULL,
        fusion_image TEXT NOT NULL,
        likes INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT now(),
        pokemon_1_name TEXT NOT NULL,
        pokemon_2_name TEXT NOT NULL
    );

    3. Create favorites Table
    Tracks user-favorite fusions.
    CREATE TABLE favorites (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        fusion_id UUID REFERENCES fusions(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT now()
    );


- OneSignal: https://documentation.onesignal.com/docs/mobile-push-setup
    I have already created an account in OneSignal:
    <script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
    <script>
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    OneSignalDeferred.push(async function(OneSignal) {
        await OneSignal.init({
        appId: "9bee561c-d825-4050-b998-1b3245cad317",
        });
    });
    </script>


# Current File Structure:
POKEMON-FUSION/
├── .next/
├── app/
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
├── hooks/
│   └── use-mobile.ts
├── lib/
│   └── utils.ts
├── node_modules/
├── public/
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── requirements/
│   └── instructions.md
├── .gitignore
├── components.json
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── README.md
└── tsconfig.json

# Rules
- All new components should be added to the components folder and be named like example-component.tsx unless otherwise specified.
- All new pages should go in /app.

