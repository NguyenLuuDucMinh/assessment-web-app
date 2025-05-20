document.addEventListener('DOMContentLoaded', () => {
    const quizForm = document.getElementById('quiz-form');
    const quizContainer = document.getElementById('quiz-container');
    const studentNameInput = document.getElementById('studentName');
    const studentSchoolInput = document.getElementById('studentSchool');
    const studentCourseInput = document.getElementById('studentCourse');
    const submitBtn = document.getElementById('submitBtn');

    const resultsContainer = document.getElementById('results-container');
    const aiGeneralFeedbackP = document.getElementById('aiGeneralFeedback');
    const finalScoreSpan = document.getElementById('finalScore');
    const finalGradeSpan = document.getElementById('finalGrade');
    const detailedFeedbackDiv = document.getElementById('detailed-feedback');
    const loadingIndicator = document.getElementById('loading-indicator');

    // --- CONFIGURATION ---
    // !!! QUAN TRỌNG: API Key không nên để lộ trực tiếp trong code client-side ở môi trường production.
    // !!! Đây là phiên bản demo, hãy cân nhắc các biện pháp bảo mật API Key của bạn.
    const GEMINI_API_KEY = 'AIzaSyCSd73INjzoI4vOxQhsQwJIABFO0ocjdo0'; // API Key của bạn
    const GOOGLE_SHEET_APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbweORR572uQnsBmL3A5N168pQF51zjckxkpTxVQtTjUDsD5j558Vq9IDGL44lsSmdqv/exec'; // URL Web App của bạn
    // --------------------

    let questionsData = [];

    async function loadQuestions() {
        try {
            const response = await fetch('questions.json'); // Sử dụng file questions.json bạn cung cấp
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            questionsData = await response.json();
            renderQuiz(questionsData);
        } catch (error) {
            console.error("Could not load questions:", error);
            quizContainer.innerHTML = "<p>Lỗi tải câu hỏi. Vui lòng thử lại sau.</p>";
        }
    }

    function renderQuiz(questions) {
        quizContainer.innerHTML = '';
        let partIHtml = '<h2>PHẦN I: CÂU HỎI LÝ THUYẾT</h2>';
        let partIIHtml = '<h2>PHẦN II: CÂU HỎI THỰC HÀNH</h2>';
        let partRendered = { I: false, II: false }; // Để đảm bảo tiêu đề phần chỉ render 1 lần

        questions.forEach((q) => {
            // Xác định phần dựa trên 8 câu đầu là lý thuyết
            const questionNumericId = parseInt(q.id.replace('q',''));
            const currentQuestionPart = questionNumericId <= 8 ? "I" : "II";

            if (currentQuestionPart === "I" && !partRendered.I) {
                quizContainer.insertAdjacentHTML('beforeend', partIHtml);
                partRendered.I = true;
            } else if (currentQuestionPart === "II" && !partRendered.II) {
                quizContainer.insertAdjacentHTML('beforeend', partIIHtml);
                partRendered.II = true;
            }

            const questionBlock = document.createElement('div');
            questionBlock.classList.add('question-block');
            questionBlock.setAttribute('data-question-id', q.id); // Sử dụng id "q1", "q2",...

            let questionHtml = `
                <h3>Câu ${questionNumericId}: ${q.category}</h3>
                <p>${q.question.replace(/\n/g, '<br>')}</p>
            `;

            if (q.type === 'theory') { // Sử dụng q.type
                questionHtml += '<div class="options">';
                q.options.forEach((optionText) => { // q.options là mảng các chuỗi
                    questionHtml += `
                        <label>
                            <input type="radio" name="question-${q.id}" value="${optionText}" required>
                            ${optionText}
                        </label>
                    `;
                });
                questionHtml += '</div>';
            } else if (q.type === 'practical') { // Sử dụng q.type
                questionHtml += `<textarea name="question-${q.id}" placeholder="Nhập câu trả lời của bạn ở đây..."></textarea>`;
            }
            questionBlock.innerHTML = questionHtml;
            quizContainer.appendChild(questionBlock);
        });
    }

    quizForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!validateStudentInfo()) return;

        submitBtn.disabled = true;
        loadingIndicator.style.display = 'block';
        resultsContainer.style.display = 'none';

        const studentInfo = {
            name: studentNameInput.value.trim(),
            school: studentSchoolInput.value.trim(),
            course: studentCourseInput.value.trim(),
            year: document.getElementById('studentYear').value,
            class: document.getElementById('studentClass').value.trim(),
            phone: document.getElementById('studentPhone').value.trim(),
            email: document.getElementById('studentEmail').value.trim(),
            submissionTime: new Date().toLocaleString('vi-VN')
        };

        const studentAnswers = getStudentAnswers();

        try {
            const evaluationResults = await evaluateAllAnswers(studentAnswers, questionsData);
            const { overallScore, grade, gradeClass, generalFeedback, detailedResults } = calculateFinalScoreAndFeedback(evaluationResults, questionsData.length);

            displayResults(overallScore, grade, gradeClass, generalFeedback, detailedResults, studentAnswers);

            const dataToSave = {
                studentInfo,
                questions: questionsData.map(q => ({
                    id: q.id,
                    questionText: q.question, // Sử dụng q.question
                    modelAnswer: q.answer      // Sử dụng q.answer làm modelAnswer
                })),
                studentAnswers: studentAnswers.map(sa => ({ id: sa.questionId, answer: sa.answer })),
                aiEvaluation: {
                    generalFeedback,
                    detailedFeedback: detailedResults.map(dr => ({
                        questionId: dr.questionId,
                        isCorrect: dr.isCorrect,
                        feedback: dr.feedback
                    })),
                    score: overallScore,
                    grade
                }
            };
            await saveToGoogleSheet(dataToSave);

        } catch (error) {
            console.error("Error during submission process:", error);
            resultsContainer.innerHTML = `<p style="color:red;">Đã xảy ra lỗi trong quá trình nộp bài hoặc đánh giá. Vui lòng thử lại. Lỗi: ${error.message}</p>`;
            resultsContainer.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            loadingIndicator.style.display = 'none';
        }
    });

    function validateStudentInfo() {
        if (!studentNameInput.value.trim() || !studentSchoolInput.value.trim() || !studentCourseInput.value.trim()) {
            alert("Vui lòng điền đầy đủ thông tin sinh viên.");
            return false;
        }
        return true;
    }

    function getStudentAnswers() {
        const answers = [];
        questionsData.forEach(q => {
            let answer = '';
            if (q.type === 'theory') { // Sử dụng q.type
                const selectedOption = quizForm.querySelector(`input[name="question-${q.id}"]:checked`);
                if (selectedOption) {
                    answer = selectedOption.value; // value là chuỗi option text
                }
            } else if (q.type === 'practical') { // Sử dụng q.type
                const textarea = quizForm.querySelector(`textarea[name="question-${q.id}"]`);
                if (textarea) {
                    answer = textarea.value.trim();
                }
            }
            answers.push({ questionId: q.id, answer: answer });
        });
        return answers;
    }

    async function evaluateAllAnswers(studentAnswers, allQuestions) {
        const evaluationPromises = studentAnswers.map(studentAns => {
            const question = allQuestions.find(q => q.id === studentAns.questionId);
            if (!question) return Promise.resolve({ questionId: studentAns.questionId, feedback: "Không tìm thấy câu hỏi.", isCorrect: false });

            if (question.type === 'theory') {
                const correctAnswerLetter = question.answer; // "A", "B", "C", or "D"
                const correctAnswerIndex = correctAnswerLetter.charCodeAt(0) - 'A'.charCodeAt(0);
                const correctAnswerText = question.options[correctAnswerIndex];
                const isCorrect = studentAns.answer === correctAnswerText;

                return Promise.resolve({
                    questionId: question.id,
                    feedback: isCorrect ? "Chính xác." : `Không chính xác. Đáp án đúng: ${correctAnswerText}`,
                    isCorrect: isCorrect
                });
            } else if (question.type === 'practical') {
                return evaluateWithGemini(question, studentAns.answer); // question.answer sẽ là model answer
            }
            return Promise.resolve({ questionId: question.id, feedback: "Loại câu hỏi không xác định.", isCorrect: false });
        });
        return Promise.all(evaluationPromises);
    }

    let generativeLanguage;
    async function initGeminiClient() {
        if (generativeLanguage) return generativeLanguage;

        return new Promise((resolve, reject) => {
            gapi.load('client', async () => {
                try {
                    await gapi.client.init({
                        apiKey: GEMINI_API_KEY,
                        discoveryDocs: ["https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta"],
                    });
                    generativeLanguage = gapi.client.generativelanguage;
                    console.log("Gemini client initialized.");
                    resolve(generativeLanguage);
                } catch (error) {
                    console.error("Error initializing Gemini client:", error);
                    reject(error);
                }
            });
        });
    }

    async function evaluateWithGemini(question, studentAnswer) {
        if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_PLACEHOLDER' || GEMINI_API_KEY.trim() === '') {
            console.warn("Gemini API Key not configured. Returning placeholder feedback.");
            // Simulate some delay
            await new Promise(resolve => setTimeout(resolve, 500));
            const isSomewhatCorrect = studentAnswer.toLowerCase().includes("function") || studentAnswer.length > 10;
            return {
                questionId: question.id,
                feedback: `(Đánh giá mẫu - API Key chưa cấu hình) Câu trả lời của bạn: "${studentAnswer.substring(0, 50)}...". Model answer: "${question.answer.substring(0,50)}..."`,
                isCorrect: isSomewhatCorrect
            };
        }

        try {
            const client = await initGeminiClient();
            if (!client || !client.models) {
                 throw new Error("Gemini client or models not available.");
            }

            const prompt = `
            Bạn là một trợ giảng AI chuyên đánh giá năng lực lập trình.
            Sinh viên được hỏi câu sau:
            ---
            Câu hỏi (ID: ${question.id}): ${question.question}
            Chủ đề: ${question.category}
            ---
            Đáp án mẫu (model answer) là:
            ---
            ${question.answer}
            ---
            Câu trả lời của sinh viên là:
            ---
            ${studentAnswer || "(Không có câu trả lời)"}
            ---
            Hãy đánh giá câu trả lời của sinh viên dựa trên các tiêu chí:
            1.  **Tính đúng đắn:** Giải pháp có đạt được mục tiêu chính của câu hỏi không? Logic có chính xác không?
            2.  **Tính hiệu quả (nếu có thể áp dụng):** Thuật toán có hợp lý về mặt hiệu suất không?
            3.  **Sự rõ ràng và phong cách (nếu là code):** Code/giải thích có dễ đọc, dễ hiểu không? Có tuân thủ các quy ước tốt không?
            4.  **Mức độ hoàn chỉnh:** Câu trả lời có đầy đủ các yêu cầu của câu hỏi không? (ví dụ: nếu yêu cầu giải thích nhược điểm và cải tiến).

            Sau đó, đưa ra nhận xét tổng quan về câu trả lời của sinh viên (khoảng 2-4 dòng).
            Cuối cùng, dựa trên đánh giá của bạn, hãy quyết định xem câu trả lời này là "Đúng" (true) hay "Sai" (false) cho mục đích chấm điểm tổng thể. Nếu câu trả lời có những ý đúng cơ bản nhưng chưa hoàn hảo, vẫn có thể coi là "Đúng" ở một mức độ nào đó. Nếu hoàn toàn sai hoặc thiếu sót nghiêm trọng, hãy coi là "Sai".

            Trả về kết quả dưới dạng một đối tượng JSON với hai khóa:
            -   "feedbackText": (string) Nhận xét chi tiết của bạn.
            -   "isCorrectOverall": (boolean) True nếu câu trả lời được coi là đúng, False nếu sai.
            LƯU Ý QUAN TRỌNG: CHỈ TRẢ VỀ ĐÚNG ĐỐI TƯỢNG JSON, KHÔNG THÊM BẤT KỲ TEXT NÀO BÊN NGOÀI JSON BLOCK.
            Ví dụ JSON output:
            {
                "feedbackText": "Sinh viên hiểu được yêu cầu tìm phần tử lớn thứ hai. Thuật toán đề xuất sử dụng hai biến để theo dõi là đúng hướng. Tuy nhiên, cần xử lý trường hợp mảng có ít hơn 2 phần tử hoặc tất cả phần tử giống nhau để tránh lỗi. Nhìn chung, ý tưởng chính xác.",
                "isCorrectOverall": true
            }
            `;

            const request = {
                model: 'models/gemini-2.0-flash', // Sử dụng model mới hơn nếu có
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 500,
                    // responseMimeType: "application/json" // Thử bật nếu API hỗ trợ tốt, giúp parse dễ hơn
                }
            };

            const result = await client.models.generateContent(request);
            const responseText = result?.result?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!responseText) {
                throw new Error("Không nhận được phản hồi hợp lệ từ AI.");
            }

            let aiResult;
            try {
                // Cố gắng làm sạch và parse JSON
                let cleanedResponseText = responseText.trim();
                if (cleanedResponseText.startsWith("```json")) {
                    cleanedResponseText = cleanedResponseText.substring(7);
                }
                if (cleanedResponseText.endsWith("```")) {
                    cleanedResponseText = cleanedResponseText.substring(0, cleanedResponseText.length - 3);
                }
                aiResult = JSON.parse(cleanedResponseText.trim());

            } catch (parseError) {
                console.error(`Error parsing Gemini JSON for question ${question.id}:`, parseError, "Raw response:", responseText);
                aiResult = {
                    feedbackText: `AI đã phản hồi, nhưng có lỗi khi xử lý định dạng: ${responseText.substring(0,200)}... (Vui lòng kiểm tra Console để xem chi tiết).`,
                    isCorrectOverall: studentAnswer.length > 10 // Heuristic đơn giản
                };
            }

            return {
                questionId: question.id,
                feedback: aiResult.feedbackText || "AI không đưa ra nhận xét cụ thể.",
                isCorrect: aiResult.isCorrectOverall === true
            };

        } catch (error) {
            console.error(`Error evaluating question ${question.id} with Gemini:`, error);
            let feedbackMessage = `Lỗi khi đánh giá bằng AI: ${error.message}.`;
            if (error.result && error.result.error) { // Chi tiết lỗi từ API của Google
                feedbackMessage += ` Chi tiết từ Google: ${error.result.error.message} (Code: ${error.result.error.code})`;
            }
            feedbackMessage += ` Câu trả lời của bạn: ${studentAnswer.substring(0,100)}...`;
            return {
                questionId: question.id,
                feedback: feedbackMessage,
                isCorrect: false
            };
        }
    }

    function calculateFinalScoreAndFeedback(evaluationResults, totalQuestions) {
        const correctAnswersCount = evaluationResults.filter(res => res.isCorrect).length;
        const theoryCorrect = evaluationResults.filter((res, idx) => res.isCorrect && idx < 8).length;
        const practicalCorrect = evaluationResults.filter((res, idx) => res.isCorrect && idx >= 8).length;

        const overallScore = parseFloat(((correctAnswersCount / totalQuestions) * 10).toFixed(1));

        let grade = "";
        let gradeClass = "";

        // Thang điểm đánh giá bạn cung cấp
        if (overallScore >= 9) { grade = "Xuất sắc"; gradeClass = "excellent"; }
        else if (overallScore >= 8) { grade = "Giỏi"; gradeClass = "good"; }
        else if (overallScore >= 7) { grade = "Khá"; gradeClass = "fair"; }
        else if (overallScore >= 5) { grade = "Trung bình"; gradeClass = "average"; }
        else { grade = "Yếu"; gradeClass = "weak"; }

        let encouragingFeedback = `Bạn đã hoàn thành ${correctAnswersCount}/${totalQuestions} câu hỏi đúng.\n\n`;
        
        if (overallScore >= 9) {
            encouragingFeedback += `Thật ấn tượng! Bạn đã thể hiện sự hiểu biết xuất sắc về cả lý thuyết (${theoryCorrect}/8 câu) và thực hành (${practicalCorrect}/12 câu). 
            Đặc biệt, cách bạn giải quyết các bài toán thực tế cho thấy khả năng tư duy logic và kỹ năng lập trình rất tốt. 
            Hãy tiếp tục phát huy và khám phá thêm các công nghệ mới nhé!`;
        } else if (overallScore >= 8) {
            encouragingFeedback += `Rất tốt! Bạn đã nắm vững kiến thức cơ bản với ${theoryCorrect}/8 câu lý thuyết và ${practicalCorrect}/12 câu thực hành đúng. 
            Khả năng giải quyết vấn đề của bạn rất tốt. Hãy tiếp tục rèn luyện để hoàn thiện hơn nữa nhé!`;
        } else if (overallScore >= 7) {
            encouragingFeedback += `Tốt! Bạn có nền tảng khá vững với ${theoryCorrect}/8 câu lý thuyết và ${practicalCorrect}/12 câu thực hành đúng. 
            Hãy dành thêm thời gian thực hành và tìm hiểu sâu hơn về các khái niệm quan trọng. 
            Bạn đang đi đúng hướng!`;
        } else if (overallScore >= 5) {
            encouragingFeedback += `Bạn đã thể hiện sự hiểu biết cơ bản với ${theoryCorrect}/8 câu lý thuyết và ${practicalCorrect}/12 câu thực hành đúng. 
            Hãy tập trung vào việc làm nhiều bài tập thực hành hơn và củng cố lại các khái niệm nền tảng. 
            Đừng ngại thử thách bản thân với các bài tập khó hơn!`;
        } else {
            encouragingFeedback += `Cảm ơn bạn đã hoàn thành bài test! Với ${theoryCorrect}/8 câu lý thuyết và ${practicalCorrect}/12 câu thực hành đúng, 
            đây là cơ hội tốt để xác định những điểm cần cải thiện. 
            Hãy bắt đầu từ việc ôn lại các khái niệm cơ bản và thực hành nhiều hơn. 
            Đừng nản chí, mọi lập trình viên giỏi đều đã từng trải qua giai đoạn này!`;
        }

        return {
            overallScore,
            grade,
            gradeClass,
            generalFeedback: encouragingFeedback,
            detailedResults: evaluationResults
        };
    }

    function displayResults(score, grade, gradeClass, generalFb, detailedFb, studentAnswers) {
        resultsContainer.style.display = 'block';
        aiGeneralFeedbackP.textContent = generalFb;
        resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }

    async function saveToGoogleSheet(data) {
        const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbweORR572uQnsBmL3A5N168pQF51zjckxkpTxVQtTjUDsD5j558Vq9IDGL44lsSmdqv/exec'; // Thay bằng URL của bạn

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                cache: 'no-cache',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            return { success: true };
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }

    loadQuestions();
});