import { Contacts } from '@capacitor-community/contacts';
import { Capacitor } from '@capacitor/core';
import { AppLauncher } from '@capacitor/app-launcher';

export async function processCommand(command: string): Promise<{
  action: string;
  url?: string;
  isBrowserAction: boolean;
  mapData?: { origin?: string; destination: string };
}> {
  const lowerCmd = command.toLowerCase().trim();

  // Check if website is working explicitly: "is amazon working?" or "check if amazon is down"
  const checkSiteMatch = lowerCmd.match(/^(?:check\s+if\s+|is\s+)(.+?)\s+(working|down|up)(?:\s+or\s+not)?\??$/);
  if (checkSiteMatch) {
    const site = checkSiteMatch[1].trim().replace(/\s+/g, "");
    const domain = site.includes(".") ? site : `${site}.com`;
    const targetUrl = `https://www.${domain}`;
    try {
      const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`);
      if (response.ok) {
        const data = await response.json();
        const code = data.status?.http_code;
        if (code && code >= 200 && code < 400) {
           return {
             action: `Yup, ${domain} is up and running properly!`,
             isBrowserAction: true
           };
        } else if (code) {
           return {
             action: `Looks like ${domain} is currently down or having issues. It returned an error code.`,
             isBrowserAction: true
           };
        }
      }
    } catch(e) {
      console.warn("Proxy check failed", e);
    }
    
    return {
      action: `I couldn't verify ${domain} directly, checking online status...`,
      url: `https://downforeveryoneorjustme.com/${domain}`,
      isBrowserAction: true
    };
  }

  // Media/E-commerce Search: "search [query] on [site]"
  const searchOnMatch = lowerCmd.match(/^search\s+(?:for\s+)?(.+?)\s+on\s+(.+)$/);
  if (searchOnMatch) {
    const query = encodeURIComponent(searchOnMatch[1].trim());
    const site = searchOnMatch[2].trim();
    let url = "";
    if (site.includes("youtube")) {
      url = `https://www.youtube.com/results?search_query=${query}`;
    } else if (site.includes("spotify")) {
      url = `https://open.spotify.com/search/${query}`;
    } else if (site.includes("amazon")) {
      url = `https://www.amazon.com/s?k=${query}`;
    } else if (site.includes("flipkart")) {
      url = `https://www.flipkart.com/search?q=${query}`;
    } else if (site.includes("google")) {
      url = `https://www.google.com/search?q=${query}`;
    } else {
      url = `https://www.google.com/search?q=${query}+site%3A${site.replace(/\s+/g, '')}.com`;
    }
    return {
      action: `Searching for ${searchOnMatch[1]} on ${site}.`,
      url,
      isBrowserAction: true
    };
  }

  // General Search explicitly requesting Google: "search google for [query]" or "search [query] on google"
  const googleSearchMatch = lowerCmd.match(/^search\s+google\s+(?:for\s+)?(.+)$/) || lowerCmd.match(/^search\s+((?:for\s+)?.+?)\s+(?:on|in)\s+google$/);
  if (googleSearchMatch) {
    const query = encodeURIComponent(googleSearchMatch[1].trim());
    return {
      action: `Searching Google for ${googleSearchMatch[1]}...`,
      url: `https://www.google.com/search?q=${query}`,
      isBrowserAction: true
    };
  }

  // General Browsing/App Opening: "Open [app/website name]"
  const openMatch = lowerCmd.match(/^open\s+(.+)$/);
  if (openMatch) {
    let targetName = openMatch[1].trim().replace(/\s+app$/, ""); // remove " app" if present
    
    if (Capacitor.isNativePlatform()) {
      const targetLower = targetName.toLowerCase().replace(/\s+/g, "");
      const appPackages: Record<string, string> = {
        youtube: 'com.google.android.youtube',
        spotify: 'com.spotify.music',
        whatsapp: 'com.whatsapp',
        instagram: 'com.instagram.android',
        facebook: 'com.facebook.katana',
        twitter: 'com.twitter.android',
        x: 'com.twitter.android',
        gmail: 'com.google.android.gm',
        maps: 'com.google.android.apps.maps',
        chrome: 'com.android.chrome',
        calculator: 'com.google.android.calculator',
        clock: 'com.google.android.deskclock'
      };

      if (appPackages[targetLower]) {
         try {
           await AppLauncher.openUrl({ url: appPackages[targetLower] });
           return {
             action: `Opening ${targetName} for you...`,
             isBrowserAction: true
           };
         } catch (e) {
           console.log("AppLauncher error", e);
           // Fall through to web search
         }
      }
    }

    let website = targetName.replace(/\s+/g, "");
    if (!website.includes(".")) {
      website += ".com";
    }
    let targetUrl = `https://www.${website}`;

    try {
      new URL(targetUrl); // Validate URL format
    } catch (e) {
      // Fallback to a google search if the URL is completely invalid (e.g. contains unescaped colons or weird characters)
      return {
        action: `I couldn't open that directly. Searching Google for ${targetName}...`,
        url: `https://www.google.com/search?q=${encodeURIComponent(targetName)}`,
        isBrowserAction: true
      };
    }

    // Verify if the website is actually working before just blindly opening it
    try {
      const proxyResponse = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`);
      if (proxyResponse.ok) {
        const data = await proxyResponse.json();
        const code = data.status?.http_code;
        // If it's a 4xx or 5xx error, inform the user it's down instead of opening
        if (code && code >= 400) {
          return {
            action: `I tried to open ${website}, but it seems to be down or unreachable right now.`,
            isBrowserAction: true
          };
        }
      }
    } catch (e) {
      // If the proxy fails, just proceed to open it normally
    }

    return {
      action: `Opening ${targetName} for you...`,
      url: targetUrl,
      isBrowserAction: true,
    };
  }

  // WhatsApp Web: "Send a WhatsApp message to [number] saying [message]"
  const waMatch = lowerCmd.match(
    /^send\s+a\s+whatsapp\s+message\s+to\s+([\d\+\s]+)\s+saying\s+(.+)$/,
  );
  if (waMatch) {
    const number = waMatch[1].replace(/\s+/g, "");
    const message = encodeURIComponent(waMatch[2].trim());
    return {
      action: `Sending your message. Let's hope they reply, Prithviraj Shetty.`,
      url: `https://web.whatsapp.com/send?phone=${number}&text=${message}`,
      isBrowserAction: true,
    };
  }

  // Phone call: "Call [number]" or "Call [name]"
  const callMatch = lowerCmd.match(/^call\s+(.+)$/);
  if (callMatch) {
    const target = callMatch[1].trim();
    // If it contains mostly digits, it's a number
    const numberMatch = target.match(/[\d\+\s\-]{4,}/);
    if (numberMatch) {
      const cleanNumber = numberMatch[0].replace(/[\s\-]/g, "");
      return {
        action: `Dialing ${cleanNumber}... Let's see if they answer.`,
        url: `tel:${cleanNumber}`,
        isBrowserAction: true,
      };
    } else {
      if (Capacitor.isNativePlatform()) {
        try {
          let permStatus = await Contacts.checkPermissions();
          if (permStatus.contacts !== 'granted') {
            permStatus = await Contacts.requestPermissions();
          }
          if (permStatus.contacts === 'granted') {
            const result = await Contacts.getContacts({ projection: { name: true, phones: true } });
            const found = result.contacts.find(c => {
              const nameStr = [c.name?.given, c.name?.middle, c.name?.family].map(n => n || "").join(" ").toLowerCase();
              return nameStr.includes(target) || (c.name?.display && c.name?.display.toLowerCase().includes(target));
            });
            
            if (found && found.phones && found.phones.length > 0) {
              const numberToCall = found.phones[0].number;
              const displayName = found.name?.display || target;
              return {
                 action: `Calling ${displayName}... Let's see if they pick up.`,
                 url: `tel:${numberToCall}`,
                 isBrowserAction: true
              };
            } else {
              return { action: `I couldn't find a contact named ${target}.`, isBrowserAction: true };
            }
          } else {
             return { action: "Please allow contact permissions so I can call them.", isBrowserAction: true };
          }
        } catch (e) {
          return { action: `Oops, I encountered an error while accessing your contacts.`, isBrowserAction: true };
        }
      } else {
        return {
          action: `I can't access your mobile contacts from the web! Try calling their number directly like "Call 9876543210".`,
          isBrowserAction: true,
        };
      }
    }
  }

  // Maps/Directions: "Directions from [place1] to [place2]"
  const directionsMatch = lowerCmd.match(/^(?:get\s+)?directions\s+(?:from\s+)?(.+?)\s+to\s+(.+)$/);
  if (directionsMatch) {
    return {
      action: `Showing directions from ${directionsMatch[1]} to ${directionsMatch[2]}. Don't get lost!`,
      url: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(directionsMatch[1])}&destination=${encodeURIComponent(directionsMatch[2])}`,
      isBrowserAction: true,
      mapData: { origin: directionsMatch[1], destination: directionsMatch[2] }
    };
  }

  // Simple location search: "Directions to [destination]"
  const simpleDirectionsMatch = lowerCmd.match(/^(?:get\s+)?directions\s+to\s+(.+)$/);
  if (simpleDirectionsMatch) {
    return {
      action: `Opening directions to ${simpleDirectionsMatch[1]} for you.`,
      url: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(simpleDirectionsMatch[1])}`,
      isBrowserAction: true,
      mapData: { destination: simpleDirectionsMatch[1] }
    };
  }

  return { action: "", isBrowserAction: false };
}
