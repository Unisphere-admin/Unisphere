-- ============================================================
-- Run this AFTER migrate-opportunities.sql to seed all existing
-- opportunities into Supabase. Run in Supabase → SQL Editor.
-- ============================================================

INSERT INTO opportunity (name, organizer, type, track, deadline, deadline_note, description, details, external_url, accent, tags, is_active) VALUES

-- ── UK OPPORTUNITIES ──────────────────────────────────────────────

('John Locke Essay Competition', 'John Locke Institute', 'essay-competition', 'uk', '2026-04-01', NULL,
 'Prestigious independent essay competition across Philosophy, Politics, Economics, History, Psychology, Theology, and Law.',
 'One of the most respected essay prizes for secondary school students. Winners receive a cash prize and are published. Shortlisted students are invited to an awards ceremony in Oxford. Judges include Oxford and Cambridge academics.',
 'https://johnlockeinstitute.com/essay-competition', 'indigo', ARRAY['essay','philosophy','politics','economics','history','oxford'], true),

('British Physics Olympiad (Round 1)', 'British Physics Olympiad', 'olympiad', 'uk', '2026-11-06', NULL,
 'The UK''s leading physics competition for A-Level students, leading to selection for the International Physics Olympiad team.',
 'Round 1 consists of a 2-hour paper sat in school. Top scorers are invited to Round 2, then the British Physics Olympiad training camp. Strong performance is highly valued in Oxford/Cambridge Physics applications.',
 'https://www.bpho.org.uk', 'blue', ARRAY['physics','stem','competition','olympiad'], true),

('UKMT Senior Mathematical Challenge', 'UK Mathematics Trust', 'olympiad', 'uk', '2026-11-05', NULL,
 'A 90-minute multiple-choice challenge for Year 12-13 students — a gateway to the British Mathematical Olympiad.',
 'Top-scoring students are invited to the British Mathematical Olympiad (BMO1), and further success leads to selection for the IMO. UKMT achievements are highly regarded by Oxford, Cambridge, and top universities for Maths courses.',
 'https://www.ukmt.org.uk', 'amber', ARRAY['maths','mathematics','stem','competition'], true),

('British Chemistry Olympiad (Part 1)', 'Royal Society of Chemistry', 'olympiad', 'uk', '2027-01-15', NULL,
 'Annual chemistry competition for A-Level students, leading to team selection for the International Chemistry Olympiad.',
 'Taken in school, Part 1 is a 2-hour paper. Top performers are invited to Part 2, and a residential course selects the UK team for the IChO. Strong performance is valued for Chemistry and Natural Sciences applications.',
 'https://www.rsc.org/education/students/olympiad', 'green', ARRAY['chemistry','stem','competition','olympiad'], true),

('British Biology Olympiad', 'Royal Society of Biology', 'olympiad', 'uk', '2027-01-22', NULL,
 'Challenge biology knowledge beyond A-Level and compete for a place in the UK team at the International Biology Olympiad.',
 'Two 45-minute papers covering a wide range of biology topics. Gold, Silver and Bronze awards are given. Top students are invited to a selection round for the IBO team. Excellent for Medicine, Natural Sciences, and Biology applications.',
 'https://www.rsb.org.uk/education/british-biology-olympiad', 'emerald', ARRAY['biology','medicine','stem','competition'], true),

('UK Linguistics Olympiad (UKLO)', 'UK Linguistics Olympiad', 'olympiad', 'uk', '2027-01-31', NULL,
 'Puzzle-based linguistics competition open to all UK secondary students — no prior linguistics knowledge needed.',
 'Consists of a Foundation Round sat in school. High scorers are invited to the Advanced Round, then the international team selection. Strong signal for Linguistics, MML, and related courses at Oxbridge.',
 'https://www.uklo.org', 'teal', ARRAY['linguistics','languages','humanities','competition'], true),

('Arkwright Engineering Scholarship', 'Arkwright Scholarships Trust', 'scholarship', 'uk', '2026-03-20', NULL,
 'Prestigious scholarships for students aspiring to become engineering and technical leaders, sponsored by leading companies.',
 'Open to Year 12 students (and equivalent). Scholars receive a bursary, a company sponsor, and access to a network of engineers and opportunities. Highly regarded for Engineering, Physics, and Computer Science applications.',
 'https://www.arkwright.org.uk', 'amber', ARRAY['engineering','scholarship','stem','leadership'], true),

('Sutton Trust Summer Schools', 'Sutton Trust', 'program', 'uk', '2026-02-15', NULL,
 'Free residential summer schools at leading UK universities for students from less advantaged backgrounds.',
 'Held at Oxford, Cambridge, Bristol, Edinburgh, and other top universities. Year 12 students experience university life, academic lectures, and admissions workshops. A strong contextual signal in university applications.',
 'https://www.suttontrust.com/our-programmes/summer-schools', 'purple', ARRAY['summer school','access','oxford','cambridge','university','residential'], true),

('Sutton Trust US Programme', 'Sutton Trust', 'program', 'uk', '2026-02-01', NULL,
 'A fully-funded programme helping UK students from less advantaged backgrounds apply to top US universities.',
 'Participants receive mentoring, campus visits to Ivy League and other top US universities, and support throughout the US application process. Open to Year 12 students from state schools with limited family income.',
 'https://www.suttontrust.com/our-programmes/us-programme', 'violet', ARRAY['us','scholarship','access','programme','ivy league'], true),

('Young Enterprise Company Programme', 'Young Enterprise', 'extracurricular', 'uk', '2026-10-01', NULL,
 'Run a real business in school with a volunteer business mentor — compete locally, regionally, and nationally.',
 'Teams of 5-20 students set up and run a business for the school year. Compete in area finals and potentially the national final. Develops entrepreneurship, leadership, and financial skills valued by universities and employers.',
 'https://www.young-enterprise.org.uk', 'green', ARRAY['business','entrepreneurship','leadership','extracurricular'], true),

('Duke of Edinburgh Gold Award', 'The Duke of Edinburgh''s Award', 'extracurricular', 'uk', '2026-09-01', 'start by Year 12',
 'A world-renowned achievement award including a volunteering project, physical challenge, skill, expedition, and residential.',
 'The Gold Award takes approximately 18 months and includes 12 months each of volunteering and a skill/physical activity, a 4-day gold expedition, and a 5-day residential away from home. Widely recognised by UK and international universities.',
 'https://www.dofe.org', 'rose', ARRAY['volunteering','leadership','extracurricular','award'], true),

('ESU Schools'' Public Speaking Competition', 'English Speaking Union', 'extracurricular', 'uk', '2026-10-15', NULL,
 'The UK''s largest public speaking competition for secondary school students — compete in pairs at school, regional and national level.',
 'Pairs consist of a speaker and a chairperson. Topics are drawn at random on the day. Regional and national finals are held in prestigious venues. Strong signal for PPE, Law, Politics, and related applications.',
 'https://www.esu.org/education/schools-public-speaking', 'blue', ARRAY['public speaking','debate','communication','extracurricular'], true),

-- ── US OPPORTUNITIES ──────────────────────────────────────────────

('QuestBridge National College Match', 'QuestBridge', 'scholarship', 'us', '2026-09-27', NULL,
 'Connects high-achieving, low-income students with full four-year scholarships to 50+ leading US colleges.',
 'College Match is binding — matched students receive a full scholarship covering tuition, room, board, and fees. Finalists who aren''t matched still benefit from streamlined applications to partner colleges. One of the most prestigious US scholarships.',
 'https://www.questbridge.org', 'amber', ARRAY['scholarship','us','financial aid','full ride','ivy league'], true),

('Coca-Cola Scholars Program', 'Coca-Cola Scholars Foundation', 'scholarship', 'us', '2026-10-31', NULL,
 'One of the most prestigious US scholarships — 150 high school seniors receive $20,000 each based on leadership and community service.',
 'Applicants are evaluated on character, leadership, and service. The online application opens September 1. Scholars join a network of over 6,500 alumni and attend a Scholars Weekend in Atlanta.',
 'https://www.coca-colascholarsfoundation.org', 'red', ARRAY['scholarship','leadership','community service','us'], true),

('Davidson Fellows Scholarship', 'Davidson Institute', 'scholarship', 'us', '2026-02-13', NULL,
 'Scholarships of $10,000, $25,000, and $50,000 for students under 18 with a significant piece of work in STEM, literature, or music.',
 'Applicants submit a significant piece of work demonstrating proficiency — a research paper, composition, literary work, or product. No minimum GPA. Fellows are celebrated in Washington DC and join an elite network.',
 'https://www.davidsongifted.org/fellows-scholarship', 'purple', ARRAY['scholarship','research','stem','arts','us'], true),

('Regeneron Science Talent Search', 'Society for Science', 'olympiad', 'us', '2026-11-01', NULL,
 'America''s oldest and most prestigious pre-college science competition — submit original research for a chance at $250,000.',
 'High school seniors submit original research projects. 300 semifinalists each receive $2,000. 40 finalists are invited to Washington DC for a week-long showcase and compete for top awards up to $250,000.',
 'https://www.societyforscience.org/regeneron-sts', 'blue', ARRAY['research','science','stem','competition','us'], true),

('Scholastic Art & Writing Awards', 'Alliance for Young Artists & Writers', 'essay-competition', 'us', '2026-12-06', NULL,
 'The most prestigious recognition for creative teens in the US — submit poetry, fiction, essays, and more for regional and national awards.',
 'Students in grades 7-12 submit work in 29 categories including poetry, personal essay/memoir, science fiction, humor, and more. Regional awards are judged locally; national Gold Medal winners are recognized in New York City.',
 'https://www.artandwriting.org', 'indigo', ARRAY['writing','creative','essay','poetry','fiction','us'], true),

('Harvard Model Congress', 'Harvard University', 'program', 'us', '2026-11-15', NULL,
 'One of the nation''s largest student-run policy conferences — simulate US Congress and other government bodies in Boston.',
 'High school students participate in committees simulating Congress, the Supreme Court, and other government bodies. Delegates write legislation, debate policy, and develop leadership skills. Held annually in February in Boston.',
 'https://www.harvardmodelcongress.org', 'red', ARRAY['government','policy','leadership','model congress','us'], true),

('National Merit Scholarship Program', 'National Merit Scholarship Corporation', 'scholarship', 'us', '2026-10-14', 'via PSAT in Oct',
 'Enter by taking the PSAT/NMSQT — the top scorers in each state become Semifinalists and compete for $2,500 scholarships.',
 'The PSAT serves as the qualifying test. About 16,000 Semifinalists advance to Finalist status by completing a detailed scholarship application. Approximately 7,500 Finalists win National Merit Scholarships worth $2,500, plus corporate and college-sponsored awards.',
 'https://www.nationalmerit.org', 'amber', ARRAY['scholarship','psat','standardised test','us'], true),

('Science Olympiad', 'Science Olympiad Inc.', 'extracurricular', 'us', '2026-11-01', 'invitational season begins',
 'A team STEM competition with 23 events spanning biology, chemistry, physics, earth science, and engineering.',
 'Teams of 15 compete at invitational, regional, state, and national tournaments. Events range from built devices and experiments to written tests. Competing at the state or national level is highly valued by top universities.',
 'https://www.soinc.org', 'green', ARRAY['stem','team','biology','chemistry','physics','us'], true),

('National Speech & Debate', 'National Speech & Debate Association', 'extracurricular', 'us', '2026-09-01', 'join your school team',
 'Join your school''s debate team and compete locally, regionally, and nationally in Lincoln-Douglas, Policy, or Public Forum debate.',
 'Over 150,000 students compete annually. National qualifiers attend the Tournament of Champions and National Championship. Debate experience is highly valued by top US universities for developing critical thinking and communication skills.',
 'https://www.speechanddebate.org', 'blue', ARRAY['debate','speech','leadership','extracurricular','us'], true),

('Model United Nations (MUN)', 'Various (HMUN, NYMUN, CMUN, etc.)', 'extracurricular', 'both', '2026-10-01', 'conference season begins',
 'Simulate UN committee debates on global issues — conferences run year-round in the UK and US at school, national, and international level.',
 'Students represent countries and debate international policy topics. Prestigious conferences include HMUN (Harvard), NYMUN, CMUN, and UK-based conferences like OXMUN and LMUN. Leadership roles as Secretary-General or chair are especially impressive on applications.',
 'https://www.un.org/en/mun', 'teal', ARRAY['debate','international relations','policy','leadership','extracurricular'], true),

('NYT Student Editorial Contest', 'New York Times Learning Network', 'essay-competition', 'us', '2027-02-14', NULL,
 'Write a 450-word persuasive editorial on any topic — winners are published in the New York Times.',
 'Open to students aged 13-19. No entry fee. Submissions must be argumentative, clearly stated, and evidence-based. Top entries are published on the NYT Learning Network and selected winners in the print edition.',
 'https://www.nytimes.com/spotlight/learning-editorial-contest', 'indigo', ARRAY['writing','editorial','essay','journalism','us'], true),

('Girls Who Code Summer Immersion', 'Girls Who Code', 'program', 'us', '2026-03-15', NULL,
 'A free 2-week intensive coding program for high school girls and non-binary students, hosted by leading tech companies.',
 'Participants learn web development, robotics, and mobile apps. Hosted at companies including Google, Apple, and Twitter. Alumni receive support through college and career. Open to students entering grades 10-12.',
 'https://girlswhocode.com/programs/summer-immersion-program', 'purple', ARRAY['coding','tech','stem','women in tech','program','us'], true);
