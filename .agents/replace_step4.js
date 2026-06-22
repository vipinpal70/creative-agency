const fs = require('fs');
const path = require('path');

const filePath = '/home/vipin/Workspace/Projects/creativeOS-vuilive_NEW/my-app/app/dashboard/onboarding/page.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add handleNextStep before handleOnboardSubmit
const targetSubmit = '  const handleOnboardSubmit = async () => {';
const submitIndex = content.indexOf(targetSubmit);
if (submitIndex === -1) {
  console.error("Could not find handleOnboardSubmit");
  process.exit(1);
}

const handleNextStepCode = `  const handleNextStep = () => {
    if (step === 1) {
      // Seed default items for active modules if empty
      const nextItems = [...scopeItems];
      
      if (selectedModules.socialMedia) {
        const hasSocial = nextItems.some((s) => s.module === "social");
        if (!hasSocial) {
          nextItems.push(
            { id: "social-reels", module: "social", label: "Reels", unit: "qty", committed: 4, platforms: ["instagram"] },
            { id: "social-posts", module: "social", label: "Posts", unit: "qty", committed: 8, platforms: ["instagram", "facebook"] },
            { id: "social-stories", module: "social", label: "Stories", unit: "qty", committed: 12, platforms: ["instagram"] }
          );
        }
      }
      if (selectedModules.paidMedia) {
        const hasPaid = nextItems.some((s) => s.module === "paid");
        if (!hasPaid) {
          nextItems.push(
            { id: "paid-meta", module: "paid", label: "Meta Ad Creatives", unit: "qty", committed: 4 },
            { id: "paid-google", module: "paid", label: "Google Ads Copy", unit: "qty", committed: 2 }
          );
        }
      }
      if (selectedModules.emailWhatsapp) {
        const hasEmail = nextItems.some((s) => s.module === "email");
        if (!hasEmail) {
          nextItems.push(
            { id: "email-promo", module: "email", label: "Promotional Campaigns", unit: "qty", committed: 4 },
            { id: "email-trans", module: "email", label: "Transactional Flows", unit: "qty", committed: 1 }
          );
        }
      }
      if (selectedModules.seo) {
        const hasSeo = nextItems.some((s) => s.module === "seo");
        if (!hasSeo) {
          nextItems.push(
            { id: "seo-blogs", module: "seo", label: "SEO Blog Posts", unit: "qty", committed: 4 },
            { id: "seo-audits", module: "seo", moduleItems: [], label: "Technical SEO Audits", unit: "qty", committed: 1 }
          );
        }
      }
      if (selectedModules.influencer) {
        const hasInfluencer = nextItems.some((s) => s.module === "influencer");
        if (!hasInfluencer) {
          nextItems.push(
            { id: "influencer-campaigns", module: "influencer", label: "Influencer Campaigns", unit: "qty", committed: 2 }
          );
        }
      }

      setScopeItems(nextItems);
    }
    setStep(step + 1);
  };

`;

content = content.substring(0, submitIndex) + handleNextStepCode + content.substring(submitIndex);

// 2. Replace Step 4 preview summary
const reviewStartMarker = '            {selectedModules.socialMedia && (';
const reviewEndMarker = '            <div className="space-y-3">\n              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Assigned internal team</p>';

const reviewStartIndex = content.indexOf(reviewStartMarker);
const reviewEndIndex = content.indexOf(reviewEndMarker);

if (reviewStartIndex === -1 || reviewEndIndex === -1) {
  console.error("Could not find review summary markers:", reviewStartIndex, reviewEndIndex);
  process.exit(1);
}

const beforeReview = content.substring(0, reviewStartIndex);
const afterReview = content.substring(reviewEndIndex);
const newReviewCode = fs.readFileSync('/home/vipin/Workspace/Projects/creativeOS-vuilive_NEW/my-app/.agents/new_step4.txt', 'utf-8');

content = beforeReview + newReviewCode + '\n' + afterReview;

// 3. Replace setStep(step + 1) with handleNextStep
const oldNextButton = '              onClick={() => setStep(step + 1)}';
const newNextButton = '              onClick={handleNextStep}';

const buttonIndex = content.indexOf(oldNextButton);
if (buttonIndex === -1) {
  console.error("Could not find next button click handler");
  process.exit(1);
}

content = content.substring(0, buttonIndex) + newNextButton + content.substring(buttonIndex + oldNextButton.length);

fs.writeFileSync(filePath, content, 'utf-8');
console.log("Step 4 replacements successful!");
