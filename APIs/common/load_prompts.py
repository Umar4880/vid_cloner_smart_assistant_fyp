from pathlib import Path
import yaml
from langchain_core.prompts import ChatPromptTemplate

class PromptLoader:
    def __init__(self, template_path: str = None) -> None:
        if template_path is None:
            self.template_path = Path(__file__).parent / "prompt.yaml"
        else:
            self.template_path = Path(template_path)

        self.all_prompts = self.load_prompts()

    def load_prompts(self):

        with open(self.template_path, 'r', encoding='utf-8') as prompt:
            all_prompts = yaml.safe_load(prompt)
            return all_prompts.get("prompts", {})
        
    def get_precise_prompt(self):

        system_prompt = self.all_prompts["notes_precise_system_prompt"]
        human_prompt = self.all_prompts["notes_precise_human_prompt"]

        return ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", human_prompt)
        ])
    
    def get_update_precise_prompt(self):

        system_prompt = self.all_prompts["notes_update_precise_system_prompt"]
        human_prompt = self.all_prompts["notes_update_precise_human_prompt"]

        return ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", human_prompt)
        ])
    
    def get_fast_prompt(self):

        system_prompt = self.all_prompts["notes_fast_system_prompt"]
        human_prompt = self.all_prompts["notes_fast_human_prompt"]

        return ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", human_prompt)
        ])
    
    def get_update_fast_prompt(self):

        system_prompt = self.all_prompts["notes_update_fast_system_prompt"]
        human_prompt = self.all_prompts["notes_update_fast_human_prompt"]

        return ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", human_prompt)
        ])

    def get_qa_prompt(self):

        system_prompt = self.all_prompts["qa_system_prompt"]
        human_prompt = self.all_prompts["qa_human_prompt"]

        return ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", human_prompt)
        ])

    def get_quiz_prompt(self):

        system_prompt = self.all_prompts["quiz_system_prompt"]
        human_prompt = self.all_prompts["quiz_human_prompt"]

        return ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", human_prompt)
        ])