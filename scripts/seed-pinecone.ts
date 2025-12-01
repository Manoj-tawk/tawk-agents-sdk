
import 'dotenv/config';
import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';

// Configuration
const PINECONE_INDEX_URL = process.env.PINECONE_INDEX_URL;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_NAMESPACE = process.env.PINECONE_NAMESPACE || 'default';

if (!PINECONE_INDEX_URL || !PINECONE_API_KEY) {
    console.error('❌ Error: PINECONE_INDEX_URL and PINECONE_API_KEY must be set in .env');
    process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY must be set in .env');
    process.exit(1);
}

// Alan Turing Knowledge Base
const documents = [
    {
        id: 'turing-birth-education',
        text: 'Alan Mathison Turing was born on June 23, 1912, in Maida Vale, London. He showed early signs of genius, particularly in mathematics and science. He attended Sherborne School, where he encountered some resistance from teachers who emphasized classics. He later studied at King\'s College, Cambridge (1931-1934), where he was awarded first-class honors in Mathematics. In 1935, at the age of 22, he was elected a fellow of King\'s College.',
        metadata: { category: 'biography', period: 'early-life' }
    },
    {
        id: 'turing-computability',
        text: 'In his seminal 1936 paper "On Computable Numbers, with an Application to the Entscheidungsproblem", Turing reformulated Kurt Gödel\'s 1931 results on the limits of proof and computation. He introduced the concept of the "Turing machine," a theoretical device that manipulates symbols on a strip of tape according to a table of rules. He proved that such a machine is capable of performing any conceivable mathematical computation if it were representable as an algorithm. This laid the foundation for modern computer science.',
        metadata: { category: 'science', period: 'pre-war' }
    },
    {
        id: 'turing-enigma',
        text: 'During World War II, Turing was a leading participant in the breaking of German ciphers at Bletchley Park. He worked on cryptanalysis of the Enigma machine. He specified the "bombe," an electromechanical device used to help decipher German Enigma-encrypted traffic. His work, along with that of his colleagues like Gordon Welchman, was crucial in cracking the naval Enigma, which helped the Allies win the Battle of the Atlantic.',
        metadata: { category: 'history', period: 'wwii' }
    },
    {
        id: 'turing-ace',
        text: 'After the war, Turing worked at the National Physical Laboratory (NPL), where he designed the Automatic Computing Engine (ACE). The ACE was one of the first designs for a stored-program computer. Although the full version of ACE was not built immediately, a smaller version, the Pilot ACE, was built and executed its first program in May 1950.',
        metadata: { category: 'computing', period: 'post-war' }
    },
    {
        id: 'turing-test',
        text: 'In 1950, Turing published "Computing Machinery and Intelligence," in which he addressed the problem of artificial intelligence. He proposed an experiment, now known as the Turing test, to define a standard for a machine to be called "intelligent." The test involves a human evaluator who would converse with a human and a machine designed to generate human-like responses. If the evaluator cannot reliably tell the machine from the human, the machine is said to have passed the test.',
        metadata: { category: 'ai', period: 'post-war' }
    },
    {
        id: 'turing-morphogenesis',
        text: 'In 1952, Turing published "The Chemical Basis of Morphogenesis," putting forth a hypothesis of pattern formation in biological systems. He suggested that a system of chemical substances, called morphogens, reacting together and diffusing through tissue, could account for the development of patterns such as the stripes on zebras or spots on leopards. This work is considered a foundational paper in mathematical biology.',
        metadata: { category: 'biology', period: 'late-life' }
    },
    {
        id: 'turing-conviction',
        text: 'In 1952, Turing was prosecuted for homosexual acts, which were then illegal in the UK. He accepted hormone treatment with DES (chemical castration) as an alternative to prison. His security clearance was revoked, and he was barred from continuing his cryptographic consultancy for GCHQ.',
        metadata: { category: 'biography', period: 'late-life' }
    },
    {
        id: 'turing-death',
        text: 'Alan Turing died on June 7, 1954, at the age of 41. The cause of death was established as cyanide poisoning. An inquest determined it was suicide, although some have suggested it might have been accidental inhalation of cyanide fumes from an experiment. A half-eaten apple was found by his bedside, leading to speculation that it was laced with cyanide, reminiscent of Snow White, though the apple was never tested.',
        metadata: { category: 'biography', period: 'death' }
    },
    {
        id: 'turing-legacy',
        text: 'Turing\'s legacy is immense. He is widely considered to be the father of theoretical computer science and artificial intelligence. The Turing Award, the highest distinction in computer science, is named after him. In 2009, British Prime Minister Gordon Brown made an official public apology on behalf of the British government for "the appalling way he was treated." In 2013, Queen Elizabeth II granted him a posthumous pardon.',
        metadata: { category: 'legacy', period: 'modern' }
    }
];

async function seedPinecone() {
    console.log('🌱 Seeding Pinecone with Alan Turing knowledge base...');
    console.log(`   Index: ${PINECONE_INDEX_URL}`);
    console.log(`   Namespace: ${PINECONE_NAMESPACE}`);

    const vectors = [];

    // Generate embeddings
    console.log('   Generating embeddings...');
    for (const doc of documents) {
        try {
            const { embedding } = await embed({
                model: openai.embedding('text-embedding-3-small'),
                value: doc.text,
                // @ts-ignore - providerOptions might not be strictly typed in all versions but it works
                providerOptions: {
                    openai: { dimensions: 1024 }
                }
            });

            vectors.push({
                id: doc.id,
                values: embedding,
                metadata: {
                    text: doc.text,
                    ...doc.metadata
                }
            });
            process.stdout.write('.');
        } catch (error) {
            console.error(`\n❌ Error generating embedding for ${doc.id}:`, error);
        }
    }
    console.log('\n   ✅ Generated embeddings for', vectors.length, 'documents');

    // Upsert to Pinecone
    console.log('   Upserting to Pinecone...');

    const response = await fetch(`${PINECONE_INDEX_URL}/vectors/upsert`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Api-Key': PINECONE_API_KEY!,
            'X-Pinecone-Api-Version': '2025-10' // Using same version as in the tool
        },
        body: JSON.stringify({
            vectors,
            namespace: PINECONE_NAMESPACE
        })
    });

    if (!response.ok) {
        const text = await response.text();
        console.error(`❌ Pinecone upsert failed: ${response.status} ${response.statusText}`);
        console.error(text);
        process.exit(1);
    }

    const result = await response.json();
    console.log('   ✅ Upsert successful:', result);
    console.log('🌱 Seeding complete!');
}

seedPinecone().catch(console.error);
