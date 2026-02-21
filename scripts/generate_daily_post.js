const { Database } = require('../backend/database');
const db = new Database();

// Configuration
const TOPICS = [
    { title: "Amazon FBA Fees 2026", category: "Logistics" },
    { title: "Korean Skincare Trends US Market", category: "Trends" },
    { title: "Amazon PPC Strategy for Beginners", category: "Marketing" },
    { title: "Global Logistics Optimization", category: "Logistics" },
    { title: "Brand Storytelling on Amazon", category: "Strategy" },
    { title: "US Consumer Behavior Analysis", category: "Strategy" },
    { title: "Choosing the Right 3PL Partner", category: "Logistics" },
    { title: "Instagram vs TikTok for Amazon Sellers", category: "Marketing" },
    { title: "K-Beauty: Packaging for US Customers", category: "Trends" }
];

const CATEGORY_IMAGES = {
    'Logistics': '/images/blog/logistics-header.png',
    'Marketing': '/images/blog/marketing-header.png',
    'Trends': '/images/blog/trends-header.png',
    'Strategy': '/images/blog/strategy-header.png'
};

function slugify(text) {
    return text.toLowerCase()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-');
}

async function run() {
    try {
        const randomTopic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
        const date = new Date().toISOString().split('T')[0];
        const headerImage = CATEGORY_IMAGES[randomTopic.category] || CATEGORY_IMAGES['Strategy'];

        const content = `
            <p><strong>Hook:</strong> 왜 ${randomTopic.title}가 2026년에 중요할까요? 글로벌 이커머스 시장에서 성공하기 위한 핵심 지표이기 때문입니다.</p>
            
            <h2>주요 통계 및 트렌드</h2>
            <div class="bg-blue-50 p-6 rounded-2xl border-l-4 border-blue-600 my-8 italic">
                "${randomTopic.title} 전략을 최적화한 브랜드일수록 전환율이 평균 15% 이상 상승하는 경향을 보입니다." — <em>AmazonReach Analytics Report</em>
            </div>

            <h2>실행 가능한 전략 (Actionable Strategy)</h2>
            <p>이 트렌드를 활용하여 비즈니스를 확장하는 방법은 다음과 같습니다:</p>
            <ul class="list-disc pl-6 space-y-2">
                <li>현재 ${randomTopic.category} 상태를 면밀히 진단하세요.</li>
                <li>AmazonReach 대시보드의 데이터를 기반으로 객관적인 결정을 내리세요.</li>
                <li>정기적인 A/B 테스트를 통해 고객의 반응을 모니터링하세요.</li>
            </ul>
            
            <p>오늘 바로 사장님의 ${randomTopic.category} 전략을 업그레이드해 보세요. AmazonReach가 함께하겠습니다.</p>
        `;

        const slug = `${slugify(randomTopic.title)}-${Date.now().toString().slice(-4)}`;

        const postData = {
            title: randomTopic.title,
            slug: slug,
            category: randomTopic.category,
            content: content,
            status: 'published', // Auto-publish
            meta_description: `Expert analysis on ${randomTopic.title} to help you scale your Amazon business globally.`,
            target_keyword: randomTopic.title,
            created_at: new Date().toISOString()
        };

        const result = await db.createPost(postData);
        console.log(`✅ Automated Blog Post Published: "${randomTopic.title}" (ID: ${result.id})`);
        process.exit(0);

    } catch (error) {
        console.error('❌ Blog automation failed:', error);
        process.exit(1);
    }
}

run();
