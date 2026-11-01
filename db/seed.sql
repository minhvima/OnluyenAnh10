-- Seed chu diem theo docs/learning-path.md (chay sau schema.sql).
-- COMMUNICATION (chu diem 15) chua co noi dung, chua them.
insert into topics (topic_code, name_vi, name_en, sort_order, phase, prereqs, priority) values
 ('TENSES',                      'Các thì',                          'Tenses',                       1, 1, '{}', 'P1'),
 ('SENTENCE_STRUCTURES',         'Cấu trúc & kết hợp câu',           'Sentence structures',          2, 1, '{}', 'P1'),
 ('MODALS_QUANTIFIERS',          'Động từ khuyết thiếu & lượng từ',  'Modals & quantifiers',         3, 1, '{}', 'P1'),
 ('ARTICLES_PRONOUNS',           'Mạo từ & đại từ',                  'Articles & pronouns',          4, 2, '{}', 'P1'),
 ('PREPOSITIONS_CONJUNCTIONS',   'Giới từ & liên từ',                'Prepositions & conjunctions',  5, 2, '{}', 'P1'),
 ('COMPARISONS',                 'So sánh',                          'Comparisons',                  6, 2, '{}', 'P1'),
 ('GERUNDS_INFINITIVES',         'V-ing / to-V / bare V',            'Gerunds & infinitives',        7, 2, '{}', 'P1'),
 ('WORD_FORMS',                  'Cấu tạo từ',                       'Word forms',                   8, 2, '{}', 'P1'),
 ('PASSIVE_VOICE',               'Câu bị động',                      'Passive voice',                9, 3, '{TENSES,MODALS_QUANTIFIERS}', 'P1'),
 ('CONDITIONALS',                'Câu điều kiện',                    'Conditionals',                10, 3, '{TENSES}', 'P1'),
 ('WISH_SENTENCES',              'Câu ước',                          'Wish sentences',              11, 3, '{TENSES,CONDITIONALS}', 'P2'),
 ('REPORTED_SPEECH',             'Câu tường thuật',                  'Reported speech',             12, 3, '{TENSES,MODALS_QUANTIFIERS,SENTENCE_STRUCTURES}', 'P2'),
 ('RELATIVE_CLAUSES',            'Mệnh đề quan hệ',                  'Relative clauses',            13, 3, '{SENTENCE_STRUCTURES,ARTICLES_PRONOUNS}', 'P2'),
 ('PHRASAL_VERBS_COLLOCATIONS',  'Cụm động từ & collocation',        'Phrasal verbs & collocations',14, 4, '{}', 'P2')
on conflict (topic_code) do update set
  name_vi = excluded.name_vi, name_en = excluded.name_en, sort_order = excluded.sort_order,
  phase = excluded.phase, prereqs = excluded.prereqs, priority = excluded.priority;

-- Admin dau tien: chay file db/admin.local.sql (chi nam tren may phu huynh, khong len git).
