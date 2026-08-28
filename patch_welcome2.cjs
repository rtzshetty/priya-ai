const fs = require('fs');
let code = fs.readFileSync('src/components/WelcomeScreen.tsx', 'utf8');

code = code.replace(
  "signInWithRedirect,",
  "signInWithRedirect,\n  getRedirectResult,"
);

code = code.replace(
  "export default function WelcomeScreen({ onNameSubmit }: WelcomeScreenProps) {",
  `export default function WelcomeScreen({ onNameSubmit }: WelcomeScreenProps) {
  React.useEffect(() => {
    // Handle redirect result for WebViews (Median)
    getRedirectResult(auth).then((result) => {
      if (result && result.user) {
        let finalName = 'User';
        if (result.user.displayName) {
          finalName = result.user.displayName.split(' ')[0];
        } else if (result.user.email) {
          finalName = deriveNameFromEmail(result.user.email);
        }
        onNameSubmit(finalName);
      }
    }).catch((err) => {
      console.error("Redirect auth error:", err);
      setError("Google Sign-in failed. Please try again.");
    });
  }, []);`
);

fs.writeFileSync('src/components/WelcomeScreen.tsx', code);
console.log("Patched WelcomeScreen with getRedirectResult");
